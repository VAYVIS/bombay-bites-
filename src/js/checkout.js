import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

const TAX_RATE = 0.05; // 5% GST

// ---------- sanity check: every id used below must exist in checkout.html ----------
const REQUIRED_IDS = [
  'userEmail', 'logoutBtn', 'checkoutError', 'payError', 'paymentPanel', 'paidActions',
  'confirmPayBtn', 'discountPct', 'paymentMethod', 'cashFields', 'cashReceived',
  'changeDue', 'checkoutLayout', 'receipt', 'billNo', 'billDate', 'billCustomer',
  'billTable', 'billTaxLabel', 'billItems', 'billSubtotal', 'billDiscount', 'billTax',
  'billTotal', 'paidStamp', 'billMethodWrap', 'billMethod', 'printBtn',
];
const missingIds = REQUIRED_IDS.filter(id => !document.getElementById(id));
if (missingIds.length) {
  console.error('checkout.html is missing element ids:', missingIds);
  const banner = document.createElement('div');
  banner.className = 'error-msg';
  banner.style.margin = '16px';
  banner.textContent = 'checkout.html is missing these element ids: ' + missingIds.join(', ');
  document.body.prepend(banner);
}

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
} else {
  console.warn('logoutBtn not found — sidebar.js may not have loaded on this page.');
}

// Order id comes from the URL (?id=...) or, as a fallback, from sessionStorage
const params = new URLSearchParams(window.location.search);
const orderId = params.get('id') || sessionStorage.getItem('checkoutOrderId');

const checkoutError = document.getElementById('checkoutError');
const payError = document.getElementById('payError');
const paymentPanel = document.getElementById('paymentPanel');
const paidActions = document.getElementById('paidActions');
const confirmBtn = document.getElementById('confirmPayBtn');
const discountInput = document.getElementById('discountPct');
const methodSelect = document.getElementById('paymentMethod');
const cashFields = document.getElementById('cashFields');
const cashInput = document.getElementById('cashReceived');
const changeDue = document.getElementById('changeDue');

let order = null;
let items = [];

// ---------- helpers ----------
const money = (n) => '₹' + Number(n || 0).toFixed(2);
const round2 = (n) => Math.round(n * 100) / 100;

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

function showError(box, message) {
  box.textContent = message;
  box.style.display = 'block';
}

function computeTotals() {
  const subtotal = round2(items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0));
  const pct = Math.min(100, Math.max(0, parseFloat(discountInput.value) || 0));
  const discount = round2(subtotal * pct / 100);
  const tax = round2((subtotal - discount) * TAX_RATE);
  const total = round2(subtotal - discount + tax);
  return { subtotal, discount, tax, total };
}

// ---------- load ----------
async function loadOrder() {
  if (!orderId) {
    showError(checkoutError, 'No order specified. Open checkout from the Orders page or the Dashboard.');
    document.getElementById('checkoutLayout').style.display = 'none';
    return;
  }

  const { data: o, error } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, status, created_at, payment_status, payment_method, subtotal, discount_amount, tax_amount, total_amount, paid_at')
    .eq('id', orderId)
    .single();

  if (error || !o) {
    console.error('Order load failed:', error);
    showError(checkoutError, 'Could not load this order: ' + (error?.message || 'not found'));
    document.getElementById('checkoutLayout').style.display = 'none';
    return;
  }
  order = o;

  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('item_name, quantity, price')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (itemsErr) {
    console.error('Items load failed:', itemsErr);
    showError(checkoutError, 'Failed to load order items: ' + itemsErr.message);
    return;
  }
  items = orderItems || [];

  render();
}

// ---------- render ----------
function renderMeta() {
  const billDate = order.paid_at || order.created_at;
  document.getElementById('billNo').textContent = 'BB-' + order.id.slice(0, 8).toUpperCase();
  document.getElementById('billDate').textContent = new Date(billDate).toLocaleString();
  document.getElementById('billCustomer').textContent = order.customer_name;
  document.getElementById('billTable').textContent = order.table_number || 'N/A';
  document.getElementById('billTaxLabel').textContent = `GST (${TAX_RATE * 100}%)`;
}

function renderItems() {
  const box = document.getElementById('billItems');
  if (items.length === 0) {
    box.innerHTML = '<p class="text-muted">No items on this order.</p>';
    return;
  }
  box.innerHTML = items.map(i => `
    <div class="receipt-item">
      <div>
        <div>${esc(i.item_name)}</div>
        <div class="qty-line">${i.quantity} × ${money(i.price)}</div>
      </div>
      <strong>${money(Number(i.price) * i.quantity)}</strong>
    </div>
  `).join('');
}

function renderTotals(t) {
  document.getElementById('billSubtotal').textContent = money(t.subtotal);
  document.getElementById('billDiscount').textContent = '−' + money(t.discount);
  document.getElementById('billTax').textContent = money(t.tax);
  document.getElementById('billTotal').textContent = money(t.total);
}

function render() {
  renderMeta();
  renderItems();

  // Already paid: read-only receipt
  if (order.payment_status === 'paid') {
    renderTotals({
      subtotal: order.subtotal,
      discount: order.discount_amount,
      tax: order.tax_amount,
      total: order.total_amount,
    });
    document.getElementById('paidStamp').style.display = 'inline-block';
    document.getElementById('billMethodWrap').style.display = 'flex';
    document.getElementById('billMethod').textContent = (order.payment_method || '').toUpperCase();
    paymentPanel.style.display = 'none';
    paidActions.style.display = 'flex';
    document.getElementById('checkoutLayout').style.gridTemplateColumns = '1fr';
    document.getElementById('receipt').style.maxWidth = '460px';
    return;
  }

  // Cannot bill cancelled or empty orders
  if (order.status === 'cancelled') {
    paymentPanel.style.display = 'none';
    showError(checkoutError, 'This order was cancelled, so it cannot be billed.');
    renderTotals(computeTotals());
    return;
  }
  if (items.length === 0) {
    paymentPanel.style.display = 'none';
    showError(checkoutError, 'This order has no items yet. Add items first, then come back to check out.');
    renderTotals(computeTotals());
    return;
  }

  paymentPanel.style.display = 'block';
  updateLiveBill();
}

// ---------- live bill while editing discount / method ----------
function updateLiveBill() {
  const t = computeTotals();
  renderTotals(t);

  if (methodSelect.value === 'cash') {
    cashFields.style.display = 'block';
    const received = parseFloat(cashInput.value);
    if (!cashInput.value) {
      changeDue.textContent = '';
      changeDue.className = 'change-due';
    } else if (received >= t.total) {
      changeDue.textContent = 'Change to return: ' + money(received - t.total);
      changeDue.className = 'change-due ok';
    } else {
      changeDue.textContent = 'Short by ' + money(t.total - received);
      changeDue.className = 'change-due short';
    }
  } else {
    cashFields.style.display = 'none';
  }
}

discountInput.addEventListener('input', updateLiveBill);
methodSelect.addEventListener('change', updateLiveBill);
cashInput.addEventListener('input', updateLiveBill);

// ---------- confirm payment ----------
confirmBtn.addEventListener('click', async () => {
  payError.style.display = 'none';
  const t = computeTotals();

  if (methodSelect.value === 'cash' && cashInput.value) {
    if (parseFloat(cashInput.value) < t.total) {
      showError(payError, 'Cash received is less than the grand total.');
      return;
    }
  }

  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Processing payment...';

  const { error } = await supabase
    .from('orders')
    .update({
      subtotal: t.subtotal,
      discount_amount: t.discount,
      tax_amount: t.tax,
      total_amount: t.total,
      payment_method: methodSelect.value,
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      status: 'completed',
    })
    .eq('id', orderId);

  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Confirm Payment';

  if (error) {
    showError(payError, 'Payment failed: ' + error.message);
    return;
  }

  await loadOrder();
});

document.getElementById('printBtn').addEventListener('click', () => window.print());

// Init
loadOrder();
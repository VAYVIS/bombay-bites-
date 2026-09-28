import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const billingError = document.getElementById('billingError');
const billsBody = document.getElementById('billsBody');
const methodFilter = document.getElementById('methodFilter');

let paidBills = [];

const money = (n) => '₹' + Number(n || 0).toFixed(2);

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ================= LOAD STATS + BILLS =================
async function loadBilling() {
  // Paid bills for this user
  const { data: paid, error } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, payment_method, total_amount, paid_at, created_at')
    .eq('user_id', session.user.id)
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false });

  if (error) {
    billingError.textContent = 'Failed to load bills: ' + error.message;
    billingError.style.display = 'block';
    billsBody.innerHTML = '<tr><td colspan="7" class="error-msg">Could not load bills.</td></tr>';
    return;
  }
  paidBills = paid || [];

  // Orders still waiting for payment (not cancelled)
  const { data: unpaid } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('user_id', session.user.id)
    .eq('payment_status', 'unpaid')
    .neq('status', 'cancelled');

  renderStats(unpaid || []);
  renderBills();
}

function renderStats(unpaid) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const total = paidBills.reduce((sum, b) => sum + Number(b.total_amount), 0);
  const today = paidBills
    .filter(b => new Date(b.paid_at) >= startOfToday)
    .reduce((sum, b) => sum + Number(b.total_amount), 0);
  const average = paidBills.length ? total / paidBills.length : 0;

  document.getElementById('statToday').textContent = money(today);
  document.getElementById('statTotal').textContent = money(total);
  document.getElementById('statCount').textContent = paidBills.length;
  document.getElementById('statAverage').textContent = money(average);
  document.getElementById('statUnpaid').textContent = unpaid.length;
}

// ================= RENDER BILL LIST (with filter) =================
function renderBills() {
  const method = methodFilter.value;
  const rows = method === 'all'
    ? paidBills
    : paidBills.filter(b => b.payment_method === method);

  if (rows.length === 0) {
    billsBody.innerHTML = `<tr><td colspan="7" class="text-muted">No paid bills${method === 'all' ? ' yet. Check out an order to create one.' : ' for this payment method.'}</td></tr>`;
    return;
  }

  billsBody.innerHTML = rows.map(b => `
    <tr>
      <td><strong>BB-${b.id.slice(0, 8).toUpperCase()}</strong></td>
      <td>${esc(b.customer_name)}</td>
      <td>${esc(b.table_number || 'N/A')}</td>
      <td><span class="method-badge">${esc(b.payment_method || '-')}</span></td>
      <td>${new Date(b.paid_at || b.created_at).toLocaleString()}</td>
      <td style="text-align:right;"><strong>${money(b.total_amount)}</strong></td>
      <td style="text-align:right;">
        <a href="checkout.html?id=${b.id}" class="btn btn-outline" style="padding:6px 14px; font-size:13px;">View Bill</a>
      </td>
    </tr>
  `).join('');
}

methodFilter.addEventListener('change', renderBills);

// Init
loadBilling();

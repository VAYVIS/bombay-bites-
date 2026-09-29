import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';
import { getMyRole } from './role.js';

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const isManager = (await getMyRole(session.user.id)) === 'manager';

const billingError = document.getElementById('billingError');
const billsBody = document.getElementById('billsBody');
const methodFilter = document.getElementById('methodFilter');
const billSearch = document.getElementById('billSearch');

let paidBills = [];

const money = (n) => '₹' + Number(n || 0).toFixed(2);

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ================= LOAD STATS + BILLS =================
async function loadBilling() {
  let paidQuery = supabase
    .from('orders')
    .select('id, customer_name, table_number, payment_method, total_amount, paid_at, created_at, profiles(full_name)')
    .eq('payment_status', 'paid')
    .order('paid_at', { ascending: false });

  let unpaidQuery = supabase
    .from('orders')
    .select('total_amount')
    .eq('payment_status', 'unpaid')
    .neq('status', 'cancelled');

  if (!isManager) {
    paidQuery = paidQuery.eq('user_id', session.user.id);
    unpaidQuery = unpaidQuery.eq('user_id', session.user.id);
  }

  const { data: paid, error } = await paidQuery;

  if (error) {
    billingError.textContent = 'Failed to load bills: ' + error.message;
    billingError.style.display = 'block';
    billsBody.innerHTML = '<tr><td colspan="8" class="error-msg">Could not load bills.</td></tr>';
    return;
  }
  billingError.style.display = 'none';
  paidBills = paid || [];

  const { data: unpaid } = await unpaidQuery;

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

// ================= RENDER BILL LIST (method filter + search) =================
function renderBills() {
  const method = methodFilter.value;
  const query = billSearch ? billSearch.value.trim().toLowerCase() : '';

  let rows = method === 'all'
    ? paidBills
    : paidBills.filter(b => b.payment_method === method);

  if (query) {
    rows = rows.filter(b =>
      (b.customer_name || '').toLowerCase().includes(query) ||
      (b.table_number || '').toLowerCase().includes(query) ||
      (b.profiles?.full_name || '').toLowerCase().includes(query) ||
      ('bb-' + b.id.slice(0, 8)).toLowerCase().includes(query)
    );
  }

  if (rows.length === 0) {
    const hasFilters = method !== 'all' || query;
    billsBody.innerHTML = `<tr><td colspan="8" class="text-muted">No paid bills${hasFilters ? ' match your filters.' : ' yet. Check out an order to create one.'}</td></tr>`;
    return;
  }

  billsBody.innerHTML = rows.map(b => `
    <tr>
      <td><strong>BB-${b.id.slice(0, 8).toUpperCase()}</strong></td>
      <td>${esc(b.customer_name)}</td>
      <td>${esc(b.table_number || 'N/A')}</td>
      <td>${esc(b.profiles?.full_name || '—')}</td>
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

if (billSearch) {
  billSearch.addEventListener('input', renderBills);
}

// Init
loadBilling();
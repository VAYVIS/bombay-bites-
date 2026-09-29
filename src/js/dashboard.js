import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';
import { getMyRole } from './role.js';

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const isManager = session ? (await getMyRole(session.user.id)) === 'manager' : false;

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ================= LOAD DASHBOARD STATS =================
async function loadStats() {
  if (!session) return;

  let totalQuery = supabase.from('orders').select('*', { count: 'exact', head: true });
  let pendingQuery = supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  if (!isManager) {
    totalQuery = totalQuery.eq('user_id', session.user.id);
    pendingQuery = pendingQuery.eq('user_id', session.user.id);
  }

  const { count: totalOrders } = await totalQuery;
  const { count: pendingOrders } = await pendingQuery;

  const { count: menuCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let revenueQuery = supabase
    .from('orders')
    .select('total_amount')
    .eq('payment_status', 'paid')
    .gte('paid_at', startOfToday.toISOString());
  if (!isManager) {
    revenueQuery = revenueQuery.eq('user_id', session.user.id);
  }
  const { data: todaysOrders } = await revenueQuery;

  const revenue = (todaysOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  document.getElementById('statTotalOrders').textContent = totalOrders ?? 0;
  document.getElementById('statPendingOrders').textContent = pendingOrders ?? 0;
  document.getElementById('statMenuItems').textContent = menuCount ?? 0;
  document.getElementById('statRevenue').textContent = `₹${revenue.toFixed(2)}`;
}

// ================= LOAD RECENT ORDERS =================
async function loadRecentOrders() {
  if (!session) return;

  let query = supabase
    .from('orders')
    .select('id, customer_name, table_number, status, total_amount, payment_status, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(5);
  if (!isManager) {
    query = query.eq('user_id', session.user.id);
  }

  const { data: orders, error } = await query;

  const listEl = document.getElementById('recentOrdersList');

  if (error) {
    listEl.innerHTML = `<p class="error-msg">Failed to load orders.</p>`;
    return;
  }

  if (!orders || orders.length === 0) {
    listEl.innerHTML = `<p class="text-muted">No orders yet. Create one from the Orders page.</p>`;
    return;
  }

  listEl.innerHTML = orders.map(o => {
    const isPaid = o.payment_status === 'paid';
    const staffLabel = isManager
      ? `<span class="text-muted" style="margin-left:8px; font-size:12px;">👤 ${esc(o.profiles?.full_name || 'Staff')}</span>`
      : '';
    return `
    <div class="order-row clickable-row" data-id="${o.id}" title="${isPaid ? 'View bill' : 'Go to checkout'}">
      <div>
        <strong>${esc(o.customer_name)}</strong>
        <span class="text-muted"> — Table ${esc(o.table_number || 'N/A')}</span>
        ${staffLabel}
      </div>
      <div>
        <span class="status-badge status-${o.status}">${o.status}</span>
        <span style="margin-left:12px;">₹${Number(o.total_amount || 0).toFixed(2)}</span>
        <span class="text-muted" style="margin-left:12px; font-size:12px;">${isPaid ? 'View bill →' : 'Checkout →'}</span>
      </div>
    </div>`;
  }).join('');

  listEl.querySelectorAll('.clickable-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.href = `checkout.html?id=${row.dataset.id}`;
    });
  });
}

loadStats();
loadRecentOrders();
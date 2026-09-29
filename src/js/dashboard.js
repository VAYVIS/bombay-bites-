import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

// Protect this page: redirect to login if no session
const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}

// Wire up logout button
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
} else {
  console.warn('logoutBtn not found — sidebar.js may not have loaded on this page.');
}

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ================= LOAD DASHBOARD STATS =================
async function loadStats() {
  if (!session) return;

  // Total orders (for this user)
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  // Pending orders
  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('status', 'pending');

  // Menu items (shared across all staff)
  const { count: menuCount } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  // Today's revenue: only bills that were PAID today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: todaysOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('user_id', session.user.id)
    .eq('payment_status', 'paid')
    .gte('paid_at', startOfToday.toISOString());

  const revenue = (todaysOrders || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  document.getElementById('statTotalOrders').textContent = totalOrders ?? 0;
  document.getElementById('statPendingOrders').textContent = pendingOrders ?? 0;
  document.getElementById('statMenuItems').textContent = menuCount ?? 0;
  document.getElementById('statRevenue').textContent = `₹${revenue.toFixed(2)}`;
}

// ================= LOAD RECENT ORDERS =================
async function loadRecentOrders() {
  if (!session) return;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, status, total_amount, payment_status, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(5);

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
    return `
    <div class="order-row clickable-row" data-id="${o.id}" title="${isPaid ? 'View bill' : 'Go to checkout'}">
      <div>
        <strong>${esc(o.customer_name)}</strong>
        <span class="text-muted"> — Table ${esc(o.table_number || 'N/A')}</span>
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
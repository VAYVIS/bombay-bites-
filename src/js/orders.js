import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

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

const ordersList = document.getElementById('ordersList');
const ordersError = document.getElementById('ordersError');
const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const modalError = document.getElementById('modalError');

// ================= MODAL CONTROLS =================
document.getElementById('openAddModal').addEventListener('click', () => {
  orderForm.reset();
  modalError.style.display = 'none';
  orderModal.style.display = 'flex';
});

document.getElementById('closeOrderModal').addEventListener('click', () => {
  orderModal.style.display = 'none';
});

// ================= CREATE ORDER (shell only — items added on next page) =================
orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const saveBtn = document.getElementById('saveOrderBtn');
  const customerName = document.getElementById('customerName').value.trim();
  const tableNumber = document.getElementById('tableNumber').value.trim();

  saveBtn.disabled = true;
  saveBtn.textContent = 'Creating...';

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: session.user.id,
      customer_name: customerName,
      table_number: tableNumber,
      status: 'pending',
      total_amount: 0,
    })
    .select()
    .single();

  saveBtn.disabled = false;
  saveBtn.textContent = 'Create Order';

  if (error) {
    modalError.textContent = error.message;
    modalError.style.display = 'block';
    return;
  }

  orderModal.style.display = 'none';
  window.location.href = `order-details.html?id=${order.id}`;
});

// ================= READ: LOAD ORDERS =================
async function loadOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, customer_name, table_number, status, payment_status, total_amount, created_at, order_items(id, item_name, quantity, price)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    ordersError.textContent = 'Failed to load orders: ' + error.message;
    ordersError.style.display = 'block';
    return;
  }

  if (!orders || orders.length === 0) {
    ordersList.innerHTML = `<p class="text-muted">No orders yet. Click "+ New Order" to create one.</p>`;
    return;
  }

  const statusOptions = ['pending', 'preparing', 'served', 'completed', 'cancelled'];

  ordersList.innerHTML = orders.map(o => {
    const isPaid = o.payment_status === 'paid';
    const isCancelled = o.status === 'cancelled';

    // Paid orders show "View Bill"; unpaid, non-cancelled orders show "Checkout"
    let billButton = '';
    if (isPaid) {
      billButton = `<a href="checkout.html?id=${o.id}" class="btn btn-outline" style="padding:6px 14px; font-size:13px;">🧾 View Bill</a>`;
    } else if (!isCancelled) {
      billButton = `<a href="checkout.html?id=${o.id}" class="btn btn-primary" style="padding:6px 14px; font-size:13px;">💳 Checkout</a>`;
    }

    return `
    <div class="card" style="margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <div>
          <h3>${o.customer_name} <span class="text-muted" style="font-weight:400; font-size:13px;">— Table ${o.table_number || 'N/A'}</span></h3>
          <p class="text-muted" style="font-size:12px; margin-top:4px;">${new Date(o.created_at).toLocaleString()}</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          ${isPaid ? `<span class="status-badge status-completed">paid</span>` : ''}
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
      </div>

      <div style="margin: 12px 0;">
        ${
          o.order_items.length === 0
            ? `<p class="text-muted" style="font-size:13px;">No items added yet.</p>`
            : o.order_items.map(i => `
              <div style="display:flex; justify-content:space-between; font-size:14px; padding:4px 0;">
                <span>${i.item_name} × ${i.quantity}</span>
                <span>₹${(i.price * i.quantity).toFixed(2)}</span>
              </div>
            `).join('')
        }
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-color); padding-top:12px; flex-wrap:wrap; gap:8px;">
        <strong>Total: ₹${Number(o.total_amount).toFixed(2)}</strong>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <select class="status-select" data-id="${o.id}" style="margin:0; width:auto; padding:6px 10px;">
            ${statusOptions.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <button class="btn btn-outline manage-items-btn" data-id="${o.id}" style="padding:6px 14px; font-size:13px;">Manage Items</button>
          ${billButton}
          <button class="btn btn-outline delete-order-btn" data-id="${o.id}" style="padding:6px 14px; font-size:13px; border-color: var(--danger); color: var(--danger);">Delete</button>
        </div>
      </div>
    </div>
  `;
  }).join('');

  document.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase
        .from('orders')
        .update({ status: sel.value })
        .eq('id', sel.dataset.id);
      if (error) alert('Failed to update status: ' + error.message);
      else loadOrders();
    });
  });

  document.querySelectorAll('.manage-items-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.href = `order-details.html?id=${btn.dataset.id}`;
    });
  });

  document.querySelectorAll('.delete-order-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = confirm('Delete this order?');
      if (!confirmed) return;
      const { error } = await supabase.from('orders').delete().eq('id', btn.dataset.id);
      if (error) alert('Failed to delete: ' + error.message);
      else loadOrders();
    });
  });
}

// Init
loadOrders();
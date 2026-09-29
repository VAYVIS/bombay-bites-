import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

// Built-in fallback image (no internet needed)
const FALLBACK_IMG = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="160" viewBox="0 0 300 160">' +
  '<rect width="300" height="160" fill="#d7dee7"/>' +
  '<text x="150" y="92" font-size="56" text-anchor="middle">🍛</text></svg>'
);

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const params = new URLSearchParams(window.location.search);
const orderId = params.get('id');

const itemsError = document.getElementById('itemsError');

if (!orderId) {
  itemsError.textContent = 'No order specified.';
  itemsError.style.display = 'block';
}

let availableItems = [];

// ================= LOAD ORDER HEADER =================
async function loadOrderHeader() {
  const { data: order, error } = await supabase
    .from('orders')
    .select('customer_name, table_number, status, created_at')
    .eq('id', orderId)
    .single();

  if (error || !order) {
    itemsError.textContent = 'Order not found.';
    itemsError.style.display = 'block';
    document.getElementById('orderCustomer').textContent = 'Order not found';
    return;
  }

  document.getElementById('orderCustomer').innerHTML = `<span class="heading-line"><span class="page-heading">${order.customer_name}</span></span>`;
  document.getElementById('orderMeta').textContent =
    `Table ${order.table_number || 'N/A'} • Status: ${order.status} • ${new Date(order.created_at).toLocaleString()}`;
}

// ================= LOAD MENU AS A VISUAL GRID =================
async function loadMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, price, image_url')
    .eq('is_available', true)
    .order('name');

  const grid = document.getElementById('menuGridSelect');

  if (error) {
    grid.innerHTML = `<p class="error-msg">Failed to load menu.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<p class="text-muted">No available items — add some in Menu first.</p>`;
    return;
  }

  availableItems = data;

  grid.innerHTML = data.map(item => `
    <div class="card menu-item-card">
      <img src="${item.image_url || FALLBACK_IMG}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" alt="${item.name}" style="width:100%; height:120px; object-fit:cover; border-radius:8px; margin-bottom:10px;" />
      <h3 style="font-size:15px;">${item.name}</h3>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
        <strong style="color: var(--accent-primary);">₹${Number(item.price).toFixed(2)}</strong>
        <div style="display:flex; align-items:center; gap:6px;">
          <input type="number" class="qty-input" data-id="${item.id}" value="1" min="1" style="width:56px; margin:0; padding:6px;" />
          <button class="btn btn-primary add-menu-item-btn" data-id="${item.id}" style="padding:6px 14px; font-size:13px;">Add</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.add-menu-item-btn').forEach(btn => {
    btn.addEventListener('click', () => addItemToOrder(btn.dataset.id));
  });
}

// ================= ADD ITEM TO ORDER (from grid click) =================
async function addItemToOrder(itemId) {
  const item = availableItems.find(i => i.id === itemId);
  if (!item) return;

  const qtyInput = document.querySelector(`.qty-input[data-id="${itemId}"]`);
  const qty = parseInt(qtyInput.value) || 1;

  const { error } = await supabase.from('order_items').insert({
    order_id: orderId,
    menu_item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: qty,
  });

  if (error) {
    itemsError.textContent = error.message;
    itemsError.style.display = 'block';
    return;
  }

  itemsError.style.display = 'none';
  qtyInput.value = 1;
  await recalculateTotal();
  await loadOrderItems();
  await loadOrderHeader();
}

// ================= LOAD & RENDER ORDER ITEMS =================
async function loadOrderItems() {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, item_name, quantity, price')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  const listEl = document.getElementById('orderItemsList');

  if (error) {
    listEl.innerHTML = `<p class="error-msg">Failed to load items.</p>`;
    return;
  }

  if (!items || items.length === 0) {
    listEl.innerHTML = `<p class="text-muted">No items added yet.</p>`;
    document.getElementById('grandTotal').textContent = '0.00';
    return;
  }

  listEl.innerHTML = items.map(i => `
    <div class="order-row">
      <span>${i.item_name} × ${i.quantity}</span>
      <div style="display:flex; align-items:center; gap:12px;">
        <span>₹${(i.price * i.quantity).toFixed(2)}</span>
        <button class="btn btn-outline remove-item-btn" data-id="${i.id}" style="padding:4px 10px; font-size:12px; border-color: var(--danger); color: var(--danger);">✕</button>
      </div>
    </div>
  `).join('');

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  document.getElementById('grandTotal').textContent = total.toFixed(2);

  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const confirmed = await confirmAction('Remove this item from the order?', { title: 'Remove item?', confirmLabel: 'Remove' });
      if (!confirmed) return;
      await supabase.from('order_items').delete().eq('id', btn.dataset.id);
      await recalculateTotal();
      await loadOrderItems();
    });
  });
}

// ================= KEEP orders.total_amount IN SYNC =================
async function recalculateTotal() {
  const { data: items } = await supabase
    .from('order_items')
    .select('price, quantity')
    .eq('order_id', orderId);

  const total = (items || []).reduce((sum, i) => sum + i.price * i.quantity, 0);

  await supabase.from('orders').update({ total_amount: total }).eq('id', orderId);
}

// Init
loadOrderHeader();
loadMenuItems();
loadOrderItems();
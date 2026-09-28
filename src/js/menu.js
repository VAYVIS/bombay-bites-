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

const menuGrid = document.getElementById('menuGrid');
const menuModal = document.getElementById('menuModal');
const menuForm = document.getElementById('menuForm');
const modalTitle = document.getElementById('modalTitle');
const modalError = document.getElementById('modalError');
const menuError = document.getElementById('menuError');

let categories = [];

// ================= LOAD CATEGORIES (for the dropdown) =================
async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) return;
  categories = data;

  const select = document.getElementById('itemCategory');
  select.innerHTML = '<option value="">Select category</option>' +
    data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// ================= READ: LOAD MENU ITEMS =================
async function loadMenu() {
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, description, price, is_available, category_id, image_url, categories(name)')
    .order('created_at', { ascending: false });

  if (error) {
    menuError.textContent = 'Failed to load menu items.';
    menuError.style.display = 'block';
    return;
  }

  if (!items || items.length === 0) {
    menuGrid.innerHTML = `<p class="text-muted">No menu items yet. Click "+ Add Item" to create one.</p>`;
    return;
  }

  menuGrid.innerHTML = items.map(item => `
    <div class="card menu-item-card">
      <img src="${item.image_url || FALLBACK_IMG}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" alt="${item.name}" style="width:100%; height:140px; object-fit:cover; border-radius:8px; margin-bottom:10px;" />
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <h3>${item.name}</h3>
        <span class="status-badge ${item.is_available ? 'status-completed' : 'status-cancelled'}">
          ${item.is_available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p class="text-muted" style="margin: 8px 0; font-size:13px;">${item.description || 'No description'}</p>
      <p class="text-muted" style="font-size:12px;">${item.categories?.name || 'Uncategorized'}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <strong style="color: var(--accent-primary); font-size:18px;">₹${Number(item.price).toFixed(2)}</strong>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline edit-btn" data-id="${item.id}" style="padding:6px 14px; font-size:13px;">Edit</button>
          <button class="btn btn-outline delete-btn" data-id="${item.id}" style="padding:6px 14px; font-size:13px; border-color: var(--danger); color: var(--danger);">Delete</button>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.edit-btn').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(btn.dataset.id, items))
  );
  document.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteItem(btn.dataset.id))
  );
}

// ================= IMAGE PREVIEW =================
const imageFileInput = document.getElementById('itemImageFile');
const imagePreview = document.getElementById('imagePreview');
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function showPreview(src) {
  if (src) {
    imagePreview.src = src;
    imagePreview.style.display = 'block';
  } else {
    imagePreview.removeAttribute('src');
    imagePreview.style.display = 'none';
  }
}

imageFileInput.addEventListener('change', () => {
  const file = imageFileInput.files[0];
  if (!file) {
    showPreview(document.getElementById('itemImage').value);
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    modalError.textContent = 'Image is too large. Please choose one under 2 MB.';
    modalError.style.display = 'block';
    imageFileInput.value = '';
    return;
  }
  modalError.style.display = 'none';
  showPreview(URL.createObjectURL(file));
});

// ================= UPLOAD IMAGE TO SUPABASE STORAGE =================
async function uploadImage(file) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${session.user.id}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from('menu-images')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('menu-images').getPublicUrl(path);
  return data.publicUrl;
}

// ================= MODAL CONTROLS =================
document.getElementById('openAddModal').addEventListener('click', () => {
  modalTitle.textContent = 'Add Menu Item';
  menuForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemImage').value = '';
  imageFileInput.value = '';
  showPreview('');
  modalError.style.display = 'none';
  menuModal.style.display = 'flex';
});

document.getElementById('closeModal').addEventListener('click', () => {
  menuModal.style.display = 'none';
});

function openEditModal(id, items) {
  const item = items.find(i => i.id === id);
  if (!item) return;

  modalTitle.textContent = 'Edit Menu Item';
  document.getElementById('itemId').value = item.id;
  document.getElementById('itemName').value = item.name;
  document.getElementById('itemDescription').value = item.description || '';
  document.getElementById('itemPrice').value = item.price;
  document.getElementById('itemCategory').value = item.category_id || '';
  document.getElementById('itemImage').value = item.image_url || '';
  imageFileInput.value = '';
  showPreview(item.image_url || '');
  document.getElementById('itemAvailable').checked = item.is_available;
  modalError.style.display = 'none';
  menuModal.style.display = 'flex';
}

// ================= CREATE / UPDATE =================
menuForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('itemId').value;
  const saveBtn = document.getElementById('saveBtn');

  const payload = {
    name: document.getElementById('itemName').value.trim(),
    description: document.getElementById('itemDescription').value.trim(),
    price: parseFloat(document.getElementById('itemPrice').value),
    category_id: document.getElementById('itemCategory').value || null,
    is_available: document.getElementById('itemAvailable').checked,
    image_url: document.getElementById('itemImage').value.trim() || null,
  };

  saveBtn.disabled = true;

  // Upload a newly chosen image first, then save its public URL with the item
  const file = imageFileInput.files[0];
  if (file) {
    saveBtn.textContent = 'Uploading image...';
    try {
      payload.image_url = await uploadImage(file);
    } catch (uploadErr) {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
      modalError.textContent = 'Image upload failed: ' + uploadErr.message;
      modalError.style.display = 'block';
      return;
    }
  }

  saveBtn.textContent = 'Saving...';

  let error;
  if (id) {
    ({ error } = await supabase.from('menu_items').update(payload).eq('id', id));
  } else {
    payload.created_by = session.user.id;
    ({ error } = await supabase.from('menu_items').insert(payload));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';

  if (error) {
    modalError.textContent = error.message;
    modalError.style.display = 'block';
    return;
  }

  menuModal.style.display = 'none';
  loadMenu();
});

// ================= DELETE =================
async function deleteItem(id) {
  const confirmed = confirm('Delete this menu item? This cannot be undone.');
  if (!confirmed) return;

  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) {
    alert('Failed to delete: ' + error.message);
    return;
  }
  loadMenu();
}

// Init
loadCategories();
loadMenu();

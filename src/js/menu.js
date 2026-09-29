import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';
import { getMyRole } from './role.js';

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

const isManager = (await getMyRole(session.user.id)) === 'manager';

const menuGrid = document.getElementById('menuGrid');
const menuModal = document.getElementById('menuModal');
const menuForm = document.getElementById('menuForm');
const modalTitle = document.getElementById('modalTitle');
const modalError = document.getElementById('modalError');
const menuError = document.getElementById('menuError');
const menuSearch = document.getElementById('menuSearch');
const openAddModalBtn = document.getElementById('openAddModal');
const openCategoryModalBtn = document.getElementById('openCategoryModal');

if (!isManager) {
  if (openAddModalBtn) openAddModalBtn.style.display = 'none';
  if (openCategoryModalBtn) openCategoryModalBtn.style.display = 'none';
}

let categories = [];
let allMenuItems = [];

// ---- XSS-safe escaping, matching orders.js / billing.js / staff.js ----
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// ================= LOAD CATEGORIES (for the dropdown) =================
async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');
  if (error) return;
  categories = data;

  const select = document.getElementById('itemCategory');
  select.innerHTML = '<option value="">Select category</option>' +
    data.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
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

  menuError.style.display = 'none';
  allMenuItems = items || [];
  renderMenu(allMenuItems);
}

// ================= RENDER =================
function renderMenu(items) {
  if (!items || items.length === 0) {
    const hasQuery = menuSearch && menuSearch.value.trim().length > 0;
    menuGrid.innerHTML = hasQuery
      ? `<p class="text-muted">No items match your search.</p>`
      : `<p class="text-muted">No menu items yet.${isManager ? ' Click "+ Add Item" to create one.' : ''}</p>`;
    return;
  }

  const actionButtons = (id) => isManager ? `
        <div style="display:flex; gap:8px;">
          <button class="btn btn-outline edit-btn" data-id="${esc(id)}" style="padding:6px 14px; font-size:13px;">Edit</button>
          <button class="btn btn-outline delete-btn" data-id="${esc(id)}" style="padding:6px 14px; font-size:13px; border-color: var(--danger); color: var(--danger);">Delete</button>
        </div>` : '';

  menuGrid.innerHTML = items.map(item => {
    // image_url is only ever set by our own uploadImage() (Supabase storage URL)
    // or validated on save (http/https only), so it's safe as an attribute here.
    const imgSrc = item.image_url || FALLBACK_IMG;
    return `
    <div class="card menu-item-card">
      <img src="${imgSrc}" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FALLBACK_IMG}'" alt="${esc(item.name)}" style="width:100%; height:140px; object-fit:cover; border-radius:8px; margin-bottom:10px;" />
      <div style="display:flex; justify-content:space-between; align-items:start;">
        <h3>${esc(item.name)}</h3>
        <span class="status-badge ${item.is_available ? 'status-completed' : 'status-cancelled'}">
          ${item.is_available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <p class="text-muted" style="margin: 8px 0; font-size:13px;">${esc(item.description) || 'No description'}</p>
      <p class="text-muted" style="font-size:12px;">${esc(item.categories?.name) || 'Uncategorized'}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
        <strong style="color: var(--accent-primary); font-size:18px;">₹${Number(item.price).toFixed(2)}</strong>
        ${actionButtons(item.id)}
      </div>
    </div>
  `;
  }).join('');

  if (isManager) {
    document.querySelectorAll('.edit-btn').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id, allMenuItems))
    );
    document.querySelectorAll('.delete-btn').forEach(btn =>
      btn.addEventListener('click', () => deleteItem(btn.dataset.id))
    );
  }
}

// ================= SEARCH =================
if (menuSearch) {
  menuSearch.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      renderMenu(allMenuItems);
      return;
    }
    const filtered = allMenuItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      (item.categories?.name || '').toLowerCase().includes(q)
    );
    renderMenu(filtered);
  });
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

// ================= MODAL CONTROLS (add/edit item) =================
if (openAddModalBtn) {
  openAddModalBtn.addEventListener('click', () => {
    modalTitle.textContent = 'Add Menu Item';
    menuForm.reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemImage').value = '';
    imageFileInput.value = '';
    showPreview('');
    modalError.style.display = 'none';
    menuModal.style.display = 'flex';
  });
}

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

// ================= CREATE / UPDATE ITEM =================
menuForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = document.getElementById('itemId').value;
  const saveBtn = document.getElementById('saveBtn');

  const rawImageUrl = document.getElementById('itemImage').value.trim();

  // Validate the manual "image URL" field — must be http(s) or empty.
  if (rawImageUrl && !/^https?:\/\//i.test(rawImageUrl)) {
    modalError.textContent = 'Image URL must start with http:// or https://';
    modalError.style.display = 'block';
    return;
  }

  const payload = {
    name: document.getElementById('itemName').value.trim(),
    description: document.getElementById('itemDescription').value.trim(),
    price: parseFloat(document.getElementById('itemPrice').value),
    category_id: document.getElementById('itemCategory').value || null,
    is_available: document.getElementById('itemAvailable').checked,
    image_url: rawImageUrl || null,
  };

  saveBtn.disabled = true;

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

// ================= DELETE ITEM =================
async function deleteItem(id) {
  const confirmed = await confirmAction('This menu item will be permanently removed.', { title: 'Delete menu item?' });
  if (!confirmed) return;

  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) {
    alert('Failed to delete: ' + error.message);
    return;
  }
  loadMenu();
}

// ================================================================
// ======================= CATEGORY CRUD =========================
// ================================================================

const categoryModal = document.getElementById('categoryModal');
const categoryError = document.getElementById('categoryError');
const categoryList = document.getElementById('categoryList');
const newCategoryForm = document.getElementById('newCategoryForm');
const newCategoryName = document.getElementById('newCategoryName');

if (openCategoryModalBtn) {
  openCategoryModalBtn.addEventListener('click', () => {
    categoryError.style.display = 'none';
    categoryModal.style.display = 'flex';
    loadCategoryList();
  });
}

document.getElementById('closeCategoryModal').addEventListener('click', () => {
  categoryModal.style.display = 'none';
  loadCategories();
  loadMenu();
});

// ---- READ: render the category list with inline rename + delete ----
async function loadCategoryList() {
  const { data, error } = await supabase.from('categories').select('id, name').order('name');

  if (error) {
    categoryError.textContent = 'Failed to load categories: ' + error.message;
    categoryError.style.display = 'block';
    return;
  }

  if (!data || data.length === 0) {
    categoryList.innerHTML = `<p class="text-muted">No categories yet. Add one above.</p>`;
    return;
  }

  categoryList.innerHTML = data.map(c => `
    <div class="card" data-cat-row="${esc(c.id)}" style="padding:10px 12px; display:flex; align-items:center; gap:8px;">
      <input type="text" class="cat-name-input" data-id="${esc(c.id)}" value="${esc(c.name)}" style="margin:0; flex:1;" />
      <button class="btn btn-outline cat-save-btn" data-id="${esc(c.id)}" style="padding:6px 12px; font-size:13px;">Save</button>
      <button class="btn btn-outline cat-delete-btn" data-id="${esc(c.id)}" style="padding:6px 12px; font-size:13px; border-color: var(--danger); color: var(--danger);">Delete</button>
    </div>
  `).join('');

  document.querySelectorAll('.cat-save-btn').forEach(btn => {
    btn.addEventListener('click', () => renameCategory(btn.dataset.id));
  });
  document.querySelectorAll('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteCategory(btn.dataset.id));
  });
}

// ---- CREATE ----
newCategoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = newCategoryName.value.trim();
  if (!name) return;

  categoryError.style.display = 'none';

  const { error } = await supabase.from('categories').insert({ name });

  if (error) {
    categoryError.textContent = 'Failed to add category: ' + error.message;
    categoryError.style.display = 'block';
    return;
  }

  newCategoryForm.reset();
  loadCategoryList();
});

// ---- UPDATE ----
async function renameCategory(id) {
  const input = document.querySelector(`.cat-name-input[data-id="${id}"]`);
  const newName = input.value.trim();
  if (!newName) {
    categoryError.textContent = 'Category name cannot be empty.';
    categoryError.style.display = 'block';
    return;
  }

  const { error } = await supabase.from('categories').update({ name: newName }).eq('id', id);

  if (error) {
    categoryError.textContent = 'Failed to rename: ' + error.message;
    categoryError.style.display = 'block';
    return;
  }

  categoryError.style.display = 'none';
  loadCategoryList();
}

// ---- DELETE ----
async function deleteCategory(id) {
  const confirmed = await confirmAction('Menu items using it will become "Uncategorized", not deleted.', { title: 'Delete category?' });
  if (!confirmed) return;

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    categoryError.textContent = 'Failed to delete: ' + error.message;
    categoryError.style.display = 'block';
    return;
  }

  loadCategoryList();
}

// Init
loadCategories();
loadMenu();
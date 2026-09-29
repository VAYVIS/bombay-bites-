import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';
import { getMyRole } from './role.js';

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const isManager = (await getMyRole(session.user.id)) === 'manager';

const staffError = document.getElementById('staffError');
const staffBody = document.getElementById('staffBody');

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Non-managers should never see this page's content.
if (!isManager) {
  staffBody.innerHTML = `<tr><td colspan="4" class="error-msg">Only managers can view this page.</td></tr>`;
} else {
  loadStaff();
}

async function loadStaff() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .order('full_name');

  if (error) {
    staffError.textContent = 'Failed to load staff: ' + error.message;
    staffError.style.display = 'block';
    return;
  }

  if (!data || data.length === 0) {
    staffBody.innerHTML = `<tr><td colspan="4" class="text-muted">No staff found.</td></tr>`;
    return;
  }

  staffBody.innerHTML = data.map(p => `
    <tr data-row="${p.id}">
      <td>${esc(p.full_name || '—')}</td>
      <td>${esc(p.email || '—')}</td>
      <td>
        <select class="role-select" data-id="${p.id}" style="margin:0; width:auto; padding:6px 10px;" ${p.id === session.user.id ? 'disabled' : ''}>
          <option value="staff" ${p.role === 'staff' ? 'selected' : ''}>Staff</option>
          <option value="manager" ${p.role === 'manager' ? 'selected' : ''}>Manager</option>
        </select>
      </td>
      <td style="text-align:right;">
        <button class="btn btn-primary save-role-btn" data-id="${p.id}" style="padding:6px 14px; font-size:13px;" ${p.id === session.user.id ? 'disabled' : ''}>Save</button>
        ${p.id === session.user.id ? '<span class="text-muted" style="font-size:12px; margin-left:8px;">(you)</span>' : ''}
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.save-role-btn').forEach(btn => {
    btn.addEventListener('click', () => saveRole(btn.dataset.id, btn));
  });
}

async function saveRole(id, btn) {
  const select = document.querySelector(`.role-select[data-id="${id}"]`);
  const newRole = select.value;

  btn.disabled = true;
  btn.textContent = 'Saving...';

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', id);

  btn.disabled = false;
  btn.textContent = 'Save';

  if (error) {
    staffError.textContent = 'Failed to update role: ' + error.message;
    staffError.style.display = 'block';
    return;
  }

  staffError.style.display = 'none';
}
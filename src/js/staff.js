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
const pendingInvitesCard = document.getElementById('pendingInvitesCard');
const pendingInvitesBody = document.getElementById('pendingInvitesBody');
const openInviteModalBtn = document.getElementById('openInviteModal');
const inviteModal = document.getElementById('inviteModal');
const inviteForm = document.getElementById('inviteForm');
const inviteError = document.getElementById('inviteError');

function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// Non-managers should never see this page's content or the invite controls.
if (!isManager) {
  staffBody.innerHTML = `<tr><td colspan="4" class="error-msg">Only managers can view this page.</td></tr>`;
  pendingInvitesCard.style.display = 'none';
  openInviteModalBtn.style.display = 'none';
} else {
  loadStaff();
  loadPendingInvites();
  wireInviteModal();
}

// ================= EXISTING STAFF TABLE (role management) =================
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

// ================= PENDING INVITES =================
async function loadPendingInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('id, email, full_name, role, created_at')
    .eq('accepted', false)
    .order('created_at', { ascending: false });

  if (error) {
    pendingInvitesBody.innerHTML = `<tr><td colspan="5" class="error-msg">Failed to load invites: ${esc(error.message)}</td></tr>`;
    return;
  }

  if (!data || data.length === 0) {
    pendingInvitesBody.innerHTML = `<tr><td colspan="5" class="text-muted">No pending invites.</td></tr>`;
    return;
  }

  pendingInvitesBody.innerHTML = data.map(inv => `
    <tr>
      <td>${esc(inv.email)}</td>
      <td>${esc(inv.full_name || '—')}</td>
      <td><span class="status-badge status-pending" style="text-transform:capitalize;">${esc(inv.role)}</span></td>
      <td>${new Date(inv.created_at).toLocaleDateString()}</td>
      <td style="text-align:right;">
        <button class="btn btn-outline cancel-invite-btn" data-id="${inv.id}" style="padding:6px 14px; font-size:13px; border-color: var(--danger); color: var(--danger);">Cancel</button>
      </td>
    </tr>
  `).join('');

  document.querySelectorAll('.cancel-invite-btn').forEach(btn => {
    btn.addEventListener('click', () => cancelInvite(btn.dataset.id));
  });
}

async function cancelInvite(id) {
  const confirmed = confirm('Cancel this invite?');
  if (!confirmed) return;

  const { error } = await supabase.from('invites').delete().eq('id', id);
  if (error) {
    alert('Failed to cancel invite: ' + error.message);
    return;
  }
  loadPendingInvites();
}

// ================= INVITE STAFF MODAL =================
function wireInviteModal() {
  openInviteModalBtn.addEventListener('click', () => {
    inviteForm.reset();
    inviteError.style.display = 'none';
    inviteModal.style.display = 'flex';
  });

  document.getElementById('closeInviteModal').addEventListener('click', () => {
    inviteModal.style.display = 'none';
  });

  inviteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('inviteEmail').value.trim().toLowerCase();
    const fullName = document.getElementById('inviteName').value.trim();
    const role = document.getElementById('inviteRole').value;
    const sendBtn = document.getElementById('sendInviteBtn');

    inviteError.style.display = 'none';
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Don't invite someone who's already an account
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send Invite';
      inviteError.textContent = 'This person already has an account. Change their role from the staff table instead.';
      inviteError.style.display = 'block';
      return;
    }

    const { error } = await supabase.from('invites').insert({
      email,
      full_name: fullName || null,
      role,
      invited_by: session.user.id,
    });

    sendBtn.disabled = false;
    sendBtn.textContent = 'Send Invite';

    if (error) {
      // Most likely the unique email constraint — a pending invite already exists
      inviteError.textContent = error.message.includes('duplicate')
        ? 'An invite for this email is already pending.'
        : 'Failed to send invite: ' + error.message;
      inviteError.style.display = 'block';
      return;
    }

    inviteModal.style.display = 'none';
    loadPendingInvites();
  });
}

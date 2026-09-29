import { supabase } from './supabaseClient.js';
import { requireAuth, logout } from './auth.js';

const FALLBACK_AVATAR = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">' +
  '<rect width="120" height="120" fill="#d7dee7"/>' +
  '<text x="60" y="76" font-size="52" text-anchor="middle">🙍</text></svg>'
);

const session = await requireAuth();
if (session) {
  document.getElementById('userEmail').textContent = session.user.email;
}
document.getElementById('logoutBtn').addEventListener('click', logout);

const profileError = document.getElementById('profileError');
const profileSuccess = document.getElementById('profileSuccess');
const profileForm = document.getElementById('profileForm');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const avatarImg = document.getElementById('avatarImg');
const avatarEditBtn = document.getElementById('avatarEditBtn');
const avatarFile = document.getElementById('avatarFile');
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

let currentAvatarUrl = null;

function showMsg(box, message) {
  box.textContent = message;
  box.style.display = 'block';
}
function hideMsg(box) {
  box.style.display = 'none';
}

// ================= LOAD PROFILE =================
async function loadProfile() {
  document.getElementById('emailField').value = session.user.email;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url, created_at')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    showMsg(profileError, 'Could not load your profile.');
    return;
  }

  document.getElementById('fullName').value = profile.full_name || '';
  document.getElementById('displayName').textContent = profile.full_name || session.user.email;
  document.getElementById('roleBadge').textContent = profile.role || 'staff';
  document.getElementById('memberSince').textContent =
    new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });

  currentAvatarUrl = profile.avatar_url || null;
  avatarImg.src = currentAvatarUrl || FALLBACK_AVATAR;
}

// ================= LOAD STATS =================
async function loadStats() {
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', session.user.id);

  const { data: paid } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('user_id', session.user.id)
    .eq('payment_status', 'paid');

  const spent = (paid || []).reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  document.getElementById('statOrders').textContent = orderCount ?? 0;
  document.getElementById('statSpent').textContent = '₹' + spent.toFixed(2);
  document.getElementById('statPaid').textContent = (paid || []).length;
}

// ================= AVATAR UPLOAD =================
avatarEditBtn.addEventListener('click', () => avatarFile.click());

avatarFile.addEventListener('change', () => {
  const file = avatarFile.files[0];
  if (!file) return;
  if (file.size > MAX_AVATAR_BYTES) {
    showMsg(profileError, 'Image is too large. Please choose one under 2 MB.');
    avatarFile.value = '';
    return;
  }
  hideMsg(profileError);
  avatarImg.src = URL.createObjectURL(file);
});

async function uploadAvatar(file) {
  const ext = file.name.split('.').pop();
  const path = `${session.user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`; // cache-bust so the new photo shows right away
}

// ================= SAVE PROFILE =================
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg(profileError);
  hideMsg(profileSuccess);

  saveProfileBtn.disabled = true;
  saveProfileBtn.textContent = 'Saving...';

  let avatarUrl = currentAvatarUrl;
  const file = avatarFile.files[0];
  if (file) {
    try {
      avatarUrl = await uploadAvatar(file);
    } catch (uploadErr) {
      saveProfileBtn.disabled = false;
      saveProfileBtn.textContent = 'Save Changes';
      showMsg(profileError, 'Photo upload failed: ' + uploadErr.message);
      return;
    }
  }

  const fullName = document.getElementById('fullName').value.trim();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, avatar_url: avatarUrl })
    .eq('id', session.user.id);

  saveProfileBtn.disabled = false;
  saveProfileBtn.textContent = 'Save Changes';

  if (error) {
    showMsg(profileError, error.message);
    return;
  }

  currentAvatarUrl = avatarUrl;
  avatarFile.value = '';
  document.getElementById('displayName').textContent = fullName || session.user.email;
  showMsg(profileSuccess, 'Profile updated.');
});

// ================= CHANGE PASSWORD =================
const passwordForm = document.getElementById('passwordForm');
const passError = document.getElementById('passError');
const passSuccess = document.getElementById('passSuccess');
const savePasswordBtn = document.getElementById('savePasswordBtn');

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMsg(passError);
  hideMsg(passSuccess);

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    showMsg(passError, 'Passwords do not match.');
    return;
  }

  savePasswordBtn.disabled = true;
  savePasswordBtn.textContent = 'Updating...';

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  savePasswordBtn.disabled = false;
  savePasswordBtn.textContent = 'Update Password';

  if (error) {
    showMsg(passError, error.message);
    return;
  }

  passwordForm.reset();
  showMsg(passSuccess, 'Password updated successfully.');
});

// Init
loadProfile();
loadStats();
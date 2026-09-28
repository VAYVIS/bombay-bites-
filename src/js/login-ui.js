// login-ui.js — UI-only behaviour for the Sign In page.
// It does NOT touch authentication; that stays in auth.js.

const passwordInput = document.getElementById('password');
const toggleBtn = document.getElementById('pwToggle');

if (passwordInput && toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';

    passwordInput.type = isHidden ? 'text' : 'password';
    toggleBtn.textContent = isHidden ? '🙈' : '👁';
    toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');

    // keep the cursor in the field so typing can continue
    passwordInput.focus();
  });
}
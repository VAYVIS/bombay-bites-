function attachRipple(button) {
  button.addEventListener('click', function (e) {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);

    ripple.classList.add('ripple');
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ---- gentle mouse-parallax for the ambient background blobs ----
function initBlobParallax() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  if (prefersReducedMotion || isCoarsePointer) return;

  const root = document.documentElement;
  let ticking = false;

  window.addEventListener('mousemove', (e) => {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      const xRatio = (e.clientX / window.innerWidth - 0.5) * 2;  // -1 to 1
      const yRatio = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
      root.style.setProperty('--mx', `${xRatio * 24}px`);
      root.style.setProperty('--my', `${yRatio * 24}px`);
      ticking = false;
    });
  });
}

// ---- reusable styled confirm modal ----
// Usage: const ok = await confirmAction('Delete this item?'); if (!ok) return;
window.confirmAction = function (message, options = {}) {
  return new Promise((resolve) => {
    const title = options.title || 'Are you sure?';
    const confirmLabel = options.confirmLabel || 'Delete';
    const cancelLabel = options.cancelLabel || 'Cancel';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="card modal-box confirm-box">
        <div class="confirm-icon">⚠️</div>
        <h2 class="brand-font" style="margin-bottom:10px;">${title}</h2>
        <p>${message}</p>
        <div class="confirm-actions">
          <button type="button" class="btn btn-outline" data-action="cancel">${cancelLabel}</button>
          <button type="button" class="btn btn-danger" data-action="confirm">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    attachRipple(overlay.querySelector('[data-action="confirm"]'));
    attachRipple(overlay.querySelector('[data-action="cancel"]'));

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));
    overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        close(false);
        document.removeEventListener('keydown', escHandler);
      }
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn').forEach(attachRipple);
  initBlobParallax();
});
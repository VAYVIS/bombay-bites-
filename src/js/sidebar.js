(function () {
  const links = [
    { href: 'dashboard.html', label: '📊 Dashboard' },
    { href: 'menu.html',      label: '🍽️ Menu' },
    { href: 'orders.html',    label: '🧾 Orders' },
    { href: 'billing.html',   label: '📄 Billing' }
  ];

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const current = location.pathname.split('/').pop();
  const items = links.map(l =>
    `<a href="${l.href}"${l.href === current ? ' class="active"' : ''}>${l.label}</a>`
  ).join('');

  sidebar.innerHTML = `
    <div class="logo brand-font" style="padding: 0 20px 24px;">🍛 Bombay Bites</div>
    <nav class="sidebar-links">${items}</nav>
    <button id="logoutBtn" class="btn btn-outline" style="margin: 20px;">Logout</button>
  `;
})();
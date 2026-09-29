import { supabase } from './supabaseClient.js';

(async function () {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const { data: { session } } = await supabase.auth.getSession();
  let isManager = false;

  if (session) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    isManager = data?.role === 'manager';
  }

  const links = [
    { href: 'dashboard.html', label: '📊 Dashboard' },
    { href: 'menu.html',      label: '🍽️ Menu' },
    { href: 'orders.html',    label: '🧾 Orders' },
    { href: 'billing.html',   label: '📄 Billing' },
  ];
  if (isManager) {
    links.push({ href: 'staff.html', label: '👥 Staff' });
  }

  const current = location.pathname.split('/').pop();
  const items = links.map(l =>
    `<a href="${l.href}"${l.href === current ? ' class="active"' : ''}>${l.label}</a>`
  ).join('');

  sidebar.innerHTML = `
    <div class="logo brand-font" style="padding: 0 20px 24px;">🍛 Bombay Bites</div>
    <nav class="sidebar-links">${items}</nav>
    <button id="logoutBtn" class="btn btn-outline" style="margin: 20px;">Logout</button>
  `;

  // ---- mobile hamburger + backdrop (drawer behaviour on narrow screens) ----
  const backdrop = document.createElement('div');
  backdrop.className = 'sidebar-backdrop';
  document.body.appendChild(backdrop);

  const hamburger = document.getElementById('sidebarHamburger');

  function openSidebar() {
    sidebar.classList.add('sidebar-open');
    backdrop.classList.add('visible');
  }
  function closeSidebar() {
    sidebar.classList.remove('sidebar-open');
    backdrop.classList.remove('visible');
  }

  if (hamburger) hamburger.addEventListener('click', openSidebar);
  backdrop.addEventListener('click', closeSidebar);
  sidebar.querySelectorAll('a').forEach(a => a.addEventListener('click', closeSidebar));
})();

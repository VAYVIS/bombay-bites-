(function () {
  const links = [
    { href: 'index.html',     label: 'Home' },
    { href: 'menu.html',      label: 'Menu' },
    { href: 'orders.html',    label: 'Orders' },
    { href: 'billing.html',   label: 'Billing' },
    { href: 'dashboard.html', label: 'Dashboard' },
    { href: 'login.html',     label: 'Sign In' }
  ];

  // ---- theme (same 'theme' key used everywhere) ----
  const root = document.documentElement;
  root.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

  // ---- styles ----
  const css = `
  .site-nav{position:relative;z-index:10;display:flex;justify-content:space-between;align-items:center;
    flex-wrap:wrap;gap:12px 24px;padding:16px 40px;}
  .site-nav .nav-brand{font-weight:800;font-size:20px;text-decoration:none;color:var(--l-ink,#3a1d12);}
  .site-nav .nav-right{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .site-nav .nav-links{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
  .site-nav .nav-links a{padding:9px 16px;border-radius:999px;border:1px solid transparent;
    color:var(--l-ink,#3a1d12);font-size:15px;font-weight:600;text-decoration:none;
    transition:background .2s,border-color .2s;}
  .site-nav .nav-links a:hover,.site-nav .nav-links a.active{
    background:var(--l-chip,rgba(255,255,255,.6));border-color:var(--l-card-border,rgba(255,255,255,.75));}
  .site-nav a:focus-visible,.site-nav button:focus-visible{outline:3px solid var(--l-accent,#c8402a);outline-offset:2px;}
  @media(max-width:700px){.site-nav{flex-direction:column;padding:16px 24px;}.site-nav .nav-right{justify-content:center;}}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ---- markup ----
  const current = location.pathname.split('/').pop() || 'index.html';
  const items = links.map(l => {
    const active = l.href === current;
    return `<a href="${l.href}"${active ? ' class="active" aria-current="page"' : ''}>${l.label}</a>`;
  }).join('');

  const header = document.createElement('header');
  header.className = 'site-nav';
  header.innerHTML = `
    <a class="nav-brand" href="index.html">Bombay Bites</a>
    <div class="nav-right">
      <nav class="nav-links" aria-label="Main">${items}</nav>
      <button id="themeToggle" class="theme-toggle" title="Switch theme"></button>
    </div>`;

  const mount = document.getElementById('site-nav');
  if (mount) mount.replaceWith(header);
  else document.body.prepend(header);

  // ---- theme toggle ----
  const toggle = header.querySelector('#themeToggle');
  const syncIcon = () => {
    toggle.textContent = root.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
  };
  syncIcon();
  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    syncIcon();
  });
})();
// Drives the mobile sidebar drawer on every dashboard-style page.
// Works with either the dynamic sidebar (js/sidebar.js) or a
// hardcoded <aside class="sidebar">, since it only needs the
// .sidebar element and the #sidebarHamburger button to exist —
// it doesn't care how the sidebar's content got there.
//
// CSS for .sidebar-open / .sidebar-backdrop / .sidebar-hamburger
// already lives in css/style.css. This file just toggles the
// classes that CSS is waiting for.
(function () {
  const sidebar = document.querySelector('.sidebar');
  const hamburger = document.getElementById('sidebarHamburger');

  if (!sidebar || !hamburger) return; // page doesn't use this pattern

  // Create the backdrop once, if this page's HTML doesn't already have one.
  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }

  function openDrawer() {
    sidebar.classList.add('sidebar-open');
    backdrop.classList.add('visible');
  }
  function closeDrawer() {
    sidebar.classList.remove('sidebar-open');
    backdrop.classList.remove('visible');
  }

  hamburger.addEventListener('click', () => {
    sidebar.classList.contains('sidebar-open') ? closeDrawer() : openDrawer();
  });

  backdrop.addEventListener('click', closeDrawer);

  // Tapping a sidebar link closes the drawer, so the next page
  // doesn't load with the drawer stuck open.
  sidebar.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') closeDrawer();
  });
})();

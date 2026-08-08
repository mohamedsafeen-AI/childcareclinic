const navButtons = document.querySelectorAll('[data-route]');
const pages = document.querySelectorAll('[data-page]');

function showPage(route) {
  pages.forEach(p => {
    const id = p.id || '';
    const isTarget = id === `page-${route}`;
    p.classList.toggle('hidden', !isTarget);
  });
  navButtons.forEach(b => b.classList.toggle('is-active', b.dataset.route === route));

  // Update topbar heading
  const heading = document.getElementById('topbar-heading');
  if (heading) {
    const activeBtn = Array.from(navButtons).find(b => b.dataset.route === route);
    if (activeBtn) heading.textContent = activeBtn.querySelector('span')?.textContent || heading.textContent;
  }

  // Lazy load page data
  if (route === 'dashboard') window.__loadDashboardPage?.();
  if (route === 'booking') window.__loadChildrenForSelect?.();
  if (route === 'children') window.__loadChildrenTable?.();
  if (route === 'vaccinations') window.__loadVaccinationsPage?.();
  if (route === 'visits') window.__loadVisitsPage?.();
  if (route === 'billing') window.__loadBillingPage?.();
}

// Hash-based navigation (supports booking redirect to #dashboard)
function navigateFromHash() {
  const route = (location.hash || '#dashboard').replace('#', '');
  showPage(route);
}

window.addEventListener('hashchange', navigateFromHash);

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    showPage(btn.dataset.route);
    history.replaceState({}, '', `#${btn.dataset.route}`);
  });
});

window.addEventListener('load', () => {
  navigateFromHash();

  const yearEl = document.getElementById('year-footer');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// route-jump helper
document.querySelectorAll('[data-route-jump]').forEach(el => {
  el.addEventListener('click', () => {
    const route = el.dataset.routeJump;
    showPage(route);
    history.replaceState({}, '', `#${route}`);
  });
});

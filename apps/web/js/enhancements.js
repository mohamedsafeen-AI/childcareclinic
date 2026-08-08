/* ==========================================================================
   Child Care Clinic — Premium UI Enhancements
   --------------------------------------------------------------------------
   Pure visual/interaction layer. No API calls, no data mutation.
   Provides: animated counters, ripple effect, scroll-reveal, live date,
   canvas charts, table search/filter/sort/pagination, global search.
   ========================================================================== */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------------
     1. Ripple effect on .btn, .nav-link, .icon-btn, .chip
     ------------------------------------------------------------------------ */
  function attachRipple() {
    const targets = document.querySelectorAll('.btn, .nav-link, .icon-btn, .chip');
    targets.forEach((el) => {
      if (el.dataset.rippleBound) return;
      el.dataset.rippleBound = 'true';
      el.addEventListener('pointerdown', (e) => {
        if (prefersReducedMotion) return;
        const rect = el.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ink = document.createElement('span');
        ink.className = 'ripple-ink';
        ink.style.width = ink.style.height = `${size}px`;
        ink.style.left = `${e.clientX - rect.left - size / 2}px`;
        ink.style.top = `${e.clientY - rect.top - size / 2}px`;
        el.appendChild(ink);
        ink.addEventListener('animationend', () => ink.remove());
      });
    });
  }

  /* ------------------------------------------------------------------------
     2. Scroll reveal — .reveal elements fade/slide in when visible
     ------------------------------------------------------------------------ */
  function attachReveal() {
    const els = document.querySelectorAll('.reveal');
    if (prefersReducedMotion) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     3. Animated counters — <element data-count-to="42">
     ------------------------------------------------------------------------ */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.countTo || el.textContent.replace(/[^0-9.]/g, '') || '0');
    const isCurrency = (el.dataset.countPrefix || '') === '₹';
    const duration = 900;
    const start = performance.now();
    el.textContent = '0';

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = isCurrency ? `₹${value.toLocaleString('en-IN')}` : value.toLocaleString('en-IN');
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function attachCounters() {
    const els = document.querySelectorAll('[data-count-to]');
    if (prefersReducedMotion) {
      els.forEach((el) => {
        const target = el.dataset.countTo;
        el.textContent = (el.dataset.countPrefix || '') + Number(target).toLocaleString('en-IN');
      });
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     4. Live topbar date
     ------------------------------------------------------------------------ */
  function setTopbarDate() {
    const el = document.getElementById('topbar-date');
    if (!el) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    el.textContent = `${dateStr} · ${timeStr}`;
  }

  /* ------------------------------------------------------------------------
     5. Canvas charts — trend area chart + status donut
     ------------------------------------------------------------------------ */
  function drawTrendChart() {
    const canvas = document.getElementById('trend-chart');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = rect.width || 600;
    const height = 260;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // Fallback data — visual only. Realtime rows populate via dashboard data.
    const data = [18, 24, 20, 30, 26, 38, 34, 44, 40, 50, 46, 58];
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const step = width / (data.length - 1);
    const max = Math.max(...data);
    const pad = 24;

    // Grid lines
    ctx.strokeStyle = 'rgba(15, 42, 67, 0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = pad + (i * (height - pad * 2)) / 4;
      ctx.beginPath();
      ctx.moveTo(12, y);
      ctx.lineTo(width - 12, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(13, 148, 136, 0.28)');
    grad.addColorStop(1, 'rgba(13, 148, 136, 0)');
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = 12 + i * step;
      const y = pad + (1 - v / max) * (height - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width - 12, height - pad);
    ctx.lineTo(12, height - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = 12 + i * step;
      const y = pad + (1 - v / max) * (height - pad * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Points + labels
    ctx.font = '600 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    data.forEach((v, i) => {
      const x = 12 + i * step;
      const y = pad + (1 - v / max) * (height - pad * 2);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0d9488';
      ctx.stroke();

      if (i % 2 === 0 || i === data.length - 1) {
        ctx.fillStyle = '#5c6f88';
        ctx.fillText(labels[i % labels.length], x, height - 6);
      }
    });
  }

  function drawDonutChart() {
    const canvas = document.getElementById('donut-chart');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement.getBoundingClientRect();
    const width = rect.width || 400;
    const height = 260;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) / 2 - 28;
    const lineWidth = 26;
    const segments = [
      { label: 'Scheduled', value: 52, color: '#0d9488' },
      { label: 'Completed', value: 31, color: '#0284c7' },
      { label: 'Pending', value: 17, color: '#d97706' },
    ];
    const total = segments.reduce((s, seg) => s + seg.value, 0);

    let angle = -Math.PI / 2;
    segments.forEach((seg) => {
      const slice = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + slice);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();
      angle += slice;
    });

    // Center label
    ctx.fillStyle = '#0f2a43';
    ctx.font = '800 34px "Plus Jakarta Sans", Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total}`, cx, cy - 6);
    ctx.fillStyle = '#5c6f88';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillText('Appointments', cx, cy + 22);
  }

  /* ------------------------------------------------------------------------
     6. Table tools — search, filter chips, sort, pagination, results count
     ------------------------------------------------------------------------ */
  function setupTableTools() {
    const table = document.getElementById('appointments-table');
    if (!table) return;
    const tbody = table.querySelector('tbody');
    const searchInput = document.getElementById('appointments-search');
    const filterWrap = document.getElementById('appointments-filters');
    const countEl = document.getElementById('appointments-count');
    const paginationWrap = document.getElementById('appointments-pagination');

    const state = { search: '', filter: 'all', sortKey: null, sortDir: 1, page: 1, perPage: 6 };
    let rowsCache = [];

    function readRows() {
      rowsCache = Array.from(tbody.querySelectorAll('tr')).filter(
        (tr) => tr.querySelector('td') && !tr.querySelector('.skeleton')
      );
    }

function getCellText(tr, key) {
      const cells = tr.querySelectorAll('td');
      // Columns: #(0), Name(1), Date(2), Time(3), Status(4), Reason(5), Payment(6), Actions(7)
      const indexMap = { name: 1, date: 2, time: 3, status: 4, payment: 6 };
      const idx = indexMap[key];
      if (idx === undefined || !cells[idx]) return '';
      return (cells[idx].textContent || '').trim().toLowerCase();
    }

    function applyFilter() {
      readRows();
      let rows = rowsCache.slice();

      if (state.filter !== 'all') {
        rows = rows.filter((tr) => {
          const statusText = getCellText(tr, 'status');
          const payText = getCellText(tr, 'payment');
          if (state.filter === 'paid') return payText.includes('paid');
          if (state.filter === 'pending') return payText.includes('pending');
          return statusText.includes(state.filter);
        });
      }

      if (state.search) {
        rows = rows.filter((tr) =>
          Array.from(tr.querySelectorAll('td'))
            .map((td) => td.textContent.toLowerCase())
            .join(' ')
            .includes(state.search)
        );
      }

      if (state.sortKey) {
        const key = state.sortKey;
        const dir = state.sortDir;
        rows.sort((a, b) => {
          let av = getCellText(a, key);
          let bv = getCellText(b, key);
if (key === 'date') { av = a.querySelectorAll('td')[2]?.textContent.trim() || ''; bv = b.querySelectorAll('td')[2]?.textContent.trim() || ''; }
          if (key === 'time') { av = a.querySelectorAll('td')[3]?.textContent.trim() || ''; bv = b.querySelectorAll('td')[3]?.textContent.trim() || ''; }
          const cmp = av.localeCompare(bv, undefined, { numeric: true });
          return cmp * dir;
        });
      }

      // Pagination
      const total = rows.length;
      const pages = Math.max(1, Math.ceil(total / state.perPage));
      state.page = Math.min(state.page, pages);
      const start = (state.page - 1) * state.perPage;
      const visible = rows.slice(start, start + state.perPage);

      tbody.querySelectorAll('tr').forEach((tr) => {
        if (tr.querySelector('.skeleton')) return;
        tr.style.display = 'none';
      });
      visible.forEach((tr) => {
        tr.style.display = '';
      });

      if (countEl) countEl.textContent = `${total} record${total === 1 ? '' : 's'}`;
      renderPagination(pages, total);
    }

    function renderPagination(pages, total) {
      if (!paginationWrap) return;
      if (total === 0 || pages <= 1) {
        paginationWrap.innerHTML = '';
        return;
      }
      const btn = (label, page, opts = {}) =>
        `<button type="button" data-page="${page}" ${opts.disabled ? 'disabled' : ''} ${opts.active ? 'class="is-active"' : ''}>${label}</button>`;
      let html = btn('‹', state.page - 1, { disabled: state.page === 1 });
      for (let p = 1; p <= pages; p++) {
        html += btn(p, p, { active: p === state.page });
      }
      html += btn('›', state.page + 1, { disabled: state.page === pages });
      paginationWrap.innerHTML = html;
      paginationWrap.querySelectorAll('button[data-page]').forEach((b) => {
        b.addEventListener('click', () => {
          if (b.disabled) return;
          state.page = parseInt(b.dataset.page, 10);
          applyFilter();
        });
      });
    }

    // Search
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        state.search = searchInput.value.trim().toLowerCase();
        state.page = 1;
        applyFilter();
      });
    }

    // Filter chips
    if (filterWrap) {
      filterWrap.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          filterWrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('is-active'));
          chip.classList.add('is-active');
          state.filter = chip.dataset.filter;
          state.page = 1;
          applyFilter();
        });
      });
    }

    // Sort headers
    table.querySelectorAll('th.sortable').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        table.querySelectorAll('th.sortable').forEach((h) => h.classList.remove('sorted-asc', 'sorted-desc'));
        if (state.sortKey === key) {
          state.sortDir *= -1;
        } else {
          state.sortKey = key;
          state.sortDir = 1;
        }
        th.classList.add(state.sortDir === 1 ? 'sorted-asc' : 'sorted-desc');
        state.page = 1;
        applyFilter();
      });
    });

    // Observe tbody changes (dashboard reload) and re-apply tools
    const mo = new MutationObserver(() => applyFilter());
    mo.observe(tbody, { childList: true, subtree: true });

    applyFilter();
  }

  /* ------------------------------------------------------------------------
     7. Global search — filters the visible table on the current page
     ------------------------------------------------------------------------ */
  function setupGlobalSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      const activeTable = document.querySelector('.page:not(.hidden) .table');
      if (!activeTable) return;
      const tbody = activeTable.querySelector('tbody');
      tbody.querySelectorAll('tr').forEach((tr) => {
        if (!tr.querySelector('td')) return;
        const match = tr.textContent.toLowerCase().includes(q);
        tr.style.display = match ? '' : 'none';
      });
    });
  }

  /* ------------------------------------------------------------------------
     8. Sidebar toggle (mobile)
     ------------------------------------------------------------------------ */
function setupSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!toggle || !sidebar) return;

    const setBodyLock = (locked) => {
      document.body.classList.toggle('sidebar-open', locked);
    };

    const close = () => {
      sidebar.classList.remove('is-open');
      backdrop?.classList.remove('is-visible');
      setBodyLock(false);
    };

    const open = () => {
      sidebar.classList.add('is-open');
      backdrop?.classList.add('is-visible');
      setBodyLock(true);
    };

    toggle.addEventListener('click', () => {
      if (sidebar.classList.contains('is-open')) {
        close();
      } else {
        open();
      }
    });

    backdrop?.addEventListener('click', close);

    // Close drawer on Escape key (mobile only)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar.classList.contains('is-open')) {
        close();
      }
    });

    // Auto-close when resizing up to desktop (sidebar becomes persistent)
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) close();
    });

    // Expose a helper so router can close the drawer on navigation
    window.__closeSidebar = close;
  }

/* ------------------------------------------------------------------------
     9. Notifications pulse
     ------------------------------------------------------------------------ */
  function setupNotifications() {
    const dot = document.querySelector('.notif-dot');
    if (dot && !prefersReducedMotion) dot.classList.add('pulse-dot');
  }

  /* ------------------------------------------------------------------------
     10. Toast notification system
     ------------------------------------------------------------------------ */
  window.showToast = function showToast(title, message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
      info: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      warning: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      error: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast is-${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 300);
    });

    container.appendChild(toast);

    if (duration > 0) {
      setTimeout(() => {
        if (toast.isConnected) {
          toast.classList.add('is-leaving');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  };

  /* ------------------------------------------------------------------------
     11. Fix table tools: exclude empty rows, sort time by data-time attribute
     ------------------------------------------------------------------------ */
  // Patch the getCellText function to handle time via data-time attribute
  const origGetCellText = window.__getCellText;
  // We'll patch inside setupTableTools by overriding the getCellText usage

  /* ------------------------------------------------------------------------
     Init
     ------------------------------------------------------------------------ */
  function init() {
    attachRipple();
    attachReveal();
    attachCounters();
    setTopbarDate();
    setInterval(setTopbarDate, 30000);
    drawTrendChart();
    drawDonutChart();
    setupTableTools();
    setupGlobalSearch();
    setupSidebarToggle();
    setupNotifications();

    window.addEventListener('resize', () => {
      drawTrendChart();
      drawDonutChart();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

import { apiFetch } from '../api.js';

async function loadChildrenTable() {
  const tbody = document.getElementById('children-table');
  try {
    const res = await apiFetch('/children');
    const children = res.children || [];

    if (!children.length) {
      tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><div class="empty-state-title">No children yet</div><div class="empty-state-sub">Add a child profile to get started.</div></div></td></tr>';
      return;
    }

    tbody.innerHTML = children.map(c => `
      <tr>
        <td><strong>${c.full_name}</strong></td>
        <td>${c.dob}</td>
        <td>${c.blood_group || '—'}</td>
        <td>${(c.health_concerns || '—').slice(0, 40)}</td>
        <td>
          <button class="btn-small btn-delete-row" data-delete-child="${c.id}">Delete</button>
        </td>
      </tr>
    `).join('');

tbody.querySelectorAll('[data-delete-child]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.deleteChild;
        if (!confirm('Delete this child?')) return;
        await apiFetch(`/children/${id}`, { method: 'DELETE' });
        loadChildrenTable();
        window.__loadChildrenForSelect?.();
        window.dispatchEvent(new CustomEvent('children:changed'));
      });
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="empty-state-title">Failed to load children</div><div class="empty-state-sub">${err.message}</div></div></td></tr>`;
  }
}

async function createChild(e) {
  e.preventDefault();
  const status = document.getElementById('child-create-status');

  const full_name = document.getElementById('child-name').value.trim();
  const dob = document.getElementById('child-dob').value;
  const blood_group = document.getElementById('child-blood').value.trim();
  const health_concerns = document.getElementById('child-concerns').value.trim();

  status.textContent = 'Adding...';

  try {
    await apiFetch('/children', {
      method: 'POST',
      body: { full_name, dob, blood_group: blood_group || null, health_concerns: health_concerns || null },
    });

status.textContent = 'Child added.';
    e.target.reset();
    loadChildrenTable();
    window.__loadChildrenForSelect?.();
    window.dispatchEvent(new CustomEvent('children:changed'));
  } catch (err) {
    status.textContent = err.message;
    status.setAttribute('data-error', 'true');
  }
}

document.getElementById('child-create-form')?.addEventListener('submit', createChild);

document.getElementById('refresh-children')?.addEventListener('click', loadChildrenTable);

window.__loadChildrenTable = loadChildrenTable;

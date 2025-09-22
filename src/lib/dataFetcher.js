const API = 'http://localhost:5174/api';


export async function fetchLeads(q) {
  const params = new URLSearchParams({
    page: String(q.page ?? 1),
    pageSize: String(q.pageSize ?? 25),
    sort: q.sort || 'id',
    dir: q.dir || 'asc',
    filters: JSON.stringify(q.filters || {})
  });
  const res = await fetch(`${API}/leads?${params}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}


export async function patchLead(id, patch) {
  const res = await fetch(`${API}/leads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });

  if (!res.ok) throw new Error('Update failed');
  return res.json();
}


export async function createLead(payload) {
  const res = await fetch(`${API}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Create failed');
  return res.json();
}


export async function bulkDeleteLeads(ids) {
  const res = await fetch(`${API}/leads/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  });
  if (!res.ok) throw new Error('Bulk delete failed');
  return res.json();
}

export async function bulkEditLeads(ids, column, value) {
  const res = await fetch(`${API}/leads/bulk-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, column, value })
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Bulk edit failed');
  }
  return res.json();
}

export async function bulkDuplicateLeads(ids, options = {}) {
  const payload = { ids, ...options };
  const res = await fetch(`${API}/leads/bulk-duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Bulk duplicate failed');
  }
  return res.json();
}

// Views API
export async function fetchViews(resource) {
  const res = await fetch(`${API}/views?resource=${encodeURIComponent(resource)}`);
  if (!res.ok) throw new Error('List views failed');
  return res.json();
}

export async function createView(resource, name, state, visibility = 'private', isDefault = false) {
  const res = await fetch(`${API}/views`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resource, name, state, visibility, is_default: isDefault })
  });
  if (!res.ok) throw new Error('Create view failed');
  return res.json();
}

export async function updateView(id, patch) {
  const res = await fetch(`${API}/views/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  if (!res.ok) throw new Error('Update view failed');
  return res.json();
}

export async function deleteViewServer(id) {
  const res = await fetch(`${API}/views/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete view failed');
  return res.json();
}
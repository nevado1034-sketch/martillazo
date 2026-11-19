import { apiFetch } from './config.js';

export async function fetchListings(params = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '' || value === 'todos') continue;
    qs.set(key, String(value));
  }
  const q = qs.toString();
  return apiFetch(`/api/listings${q ? `?${q}` : ''}`);
}

export async function fetchListing(id, token) {
  return apiFetch(`/api/listings/${id}`, token ? { token } : {});
}

export async function createListing(token, input) {
  return apiFetch('/api/listings', { token, method: 'POST', body: input });
}

export async function updateListing(token, id, input) {
  return apiFetch(`/api/listings/${id}`, {
    token,
    method: 'PATCH',
    body: input,
  });
}

export async function updateListingStatus(token, id, status) {
  return apiFetch(`/api/listings/${id}/status`, {
    token,
    method: 'PATCH',
    body: { status },
  });
}

export async function deleteListing(token, id) {
  return apiFetch(`/api/listings/${id}`, { token, method: 'DELETE' });
}

export async function fetchMyListings(token) {
  return apiFetch('/api/me/listings', { token });
}

export async function fetchRelatedForListing(id, { limit } = {}) {
  const qs = limit ? `?limit=${limit}` : '';
  return apiFetch(`/api/listings/${id}/related${qs}`);
}

export async function fetchRelatedListings({
  q,
  tipo,
  cat,
  exclude,
  limit,
} = {}) {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (tipo && tipo !== 'todos') qs.set('tipo', tipo);
  if (cat) qs.set('cat', cat);
  if (exclude?.length) qs.set('exclude', exclude.join(','));
  if (limit) qs.set('limit', String(limit));
  const qstr = qs.toString();
  return apiFetch(`/api/listings/related${qstr ? `?${qstr}` : ''}`);
}

import { apiFetch } from './config.js';

export async function fetchListings(params = {}) {
  const qs = new URLSearchParams();
  if (params.tipo && params.tipo !== 'todos') qs.set('tipo', params.tipo);
  if (params.q) qs.set('q', params.q);
  if (params.cat) qs.set('cat', params.cat);
  const q = qs.toString();
  return apiFetch(`/api/listings${q ? `?${q}` : ''}`);
}

export async function fetchListing(id, token) {
  return apiFetch(`/api/listings/${id}`, token ? { token } : {});
}

export async function createListing(token, input) {
  return apiFetch('/api/listings', { token, method: 'POST', body: input });
}

export async function fetchMyListings(token) {
  return apiFetch('/api/me/listings', { token });
}

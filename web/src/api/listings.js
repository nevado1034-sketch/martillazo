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

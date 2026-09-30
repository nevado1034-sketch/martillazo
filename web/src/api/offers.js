import { apiFetch } from './config.js';

export async function createOffer(token, listingId, { amount, message }) {
  return apiFetch(`/api/listings/${listingId}/offers`, {
    token,
    method: 'POST',
    body: { amount, message },
  });
}

export async function fetchListingOffers(token, listingId) {
  return apiFetch(`/api/listings/${listingId}/offers`, { token });
}

export async function fetchMyOffers(token) {
  return apiFetch('/api/me/offers', { token });
}

export async function fetchMySales(token) {
  return apiFetch('/api/me/sales', { token });
}

export async function respondOffer(token, offerId, action) {
  return apiFetch(`/api/listings/offers/${offerId}`, {
    token,
    method: 'PATCH',
    body: { action },
  });
}

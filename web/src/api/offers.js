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

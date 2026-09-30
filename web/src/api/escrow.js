import { apiFetch } from './config.js';

export async function fetchEscrowConfig() {
  return apiFetch('/api/escrow/config');
}

export async function fetchMyOrders(token, role = 'all') {
  const q = role && role !== 'all' ? `?role=${role}` : '';
  return apiFetch(`/api/escrow/orders${q}`, { token });
}

export async function fetchOrder(token, id) {
  return apiFetch(`/api/escrow/orders/${id}`, { token });
}

export async function createOrderFromOffer(token, offerId) {
  return apiFetch('/api/escrow/orders/from-offer', {
    token,
    method: 'POST',
    body: { offerId },
  });
}

export async function buyNow(token, listingId) {
  return apiFetch('/api/escrow/orders/buy-now', {
    token,
    method: 'POST',
    body: { listingId },
  });
}

export async function payOrderSandbox(token, orderId) {
  return apiFetch(`/api/escrow/orders/${orderId}/pay-sandbox`, {
    token,
    method: 'POST',
    body: {},
  });
}

export async function shipOrder(token, orderId) {
  return apiFetch(`/api/escrow/orders/${orderId}/ship`, {
    token,
    method: 'POST',
    body: {},
  });
}

export async function deliverOrder(token, orderId) {
  return apiFetch(`/api/escrow/orders/${orderId}/deliver`, {
    token,
    method: 'POST',
    body: {},
  });
}

export async function confirmOrder(token, orderId) {
  return apiFetch(`/api/escrow/orders/${orderId}/confirm`, {
    token,
    method: 'POST',
    body: {},
  });
}

export async function disputeOrder(token, orderId, reason) {
  return apiFetch(`/api/escrow/orders/${orderId}/dispute`, {
    token,
    method: 'POST',
    body: { reason },
  });
}

import { API_URL } from './config.js';

/**
 * Lista subastas ACTIVAS.
 * @param {{ flow?: 'STANDARD'|'PREMIUM', type?: 'CACHIVACHES'|'BIENES_RAICES', category?: string, q?: string, limit?: number }} opts
 */
export async function fetchActiveAuctions({ flow, q, type, category, limit } = {}) {
  const params = new URLSearchParams();
  if (flow) params.set('flow', flow);
  if (type) params.set('type', type);
  if (category) params.set('category', category);
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));

  const res = await fetch(`${API_URL}/api/auctions?${params.toString()}`);
  if (!res.ok) throw new Error('No se pudieron cargar las subastas');
  const { data } = await res.json();
  return data;
}

/** Detalle público de una subasta (producto, vendedor, historial de pujas). */
export async function fetchAuctionDetail(auctionId) {
  const res = await fetch(`${API_URL}/api/auctions/${auctionId}`);
  if (!res.ok) {
    let message = 'No se pudo cargar la subasta';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso: se usa el mensaje por defecto
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** Categorías activas para el formulario de alta. */
export async function fetchCategories() {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) throw new Error('No se pudieron cargar las categorías');
  const { data } = await res.json();
  return data;
}

/** Publicaciones del vendedor autenticado (panel de control). */
export async function fetchMyAuctions(token) {
  const res = await fetch(`${API_URL}/api/my/auctions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudieron cargar tus publicaciones');
  const { data } = await res.json();
  return data;
}

/** Postores de una subasta (solo el dueño): quién paga más y cómo contactarlo. */
export async function fetchAuctionBidders({ auctionId, token }) {
  const res = await fetch(`${API_URL}/api/auctions/${auctionId}/bidders`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = 'No se pudieron cargar los postores';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** Pujas del cliente autenticado, con el estado de cada subasta. */
export async function fetchMyBids(token) {
  const res = await fetch(`${API_URL}/api/my/bids`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudieron cargar tus pujas');
  const { data } = await res.json();
  return data;
}

/** Estado de entrega y pago en custodia de una subasta adjudicada. */
export async function fetchDeliveryState({ auctionId, token }) {
  const res = await fetch(`${API_URL}/api/auctions/${auctionId}/delivery`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = 'No se pudo cargar el estado de la venta';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** Pago del ganador (flujo estándar): deja la garantía en custodia. */
export async function payWinningAuction({ auctionId, amount, token, idempotencyKey }) {
  const res = await fetch(`${API_URL}/api/payments/standard/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ auctionId, amount }),
  });
  if (!res.ok) {
    let message = 'No se pudo procesar el pago';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** El ganador confirma que recibió el producto. */
export async function confirmDelivery({ auctionId, token }) {
  const res = await fetch(`${API_URL}/api/auctions/${auctionId}/confirm-delivery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  if (!res.ok) {
    let message = 'No se pudo confirmar la entrega';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** El vendedor cierra la venta y libera el escrow. */
export async function settleAuction({ auctionId, token }) {
  const res = await fetch(`${API_URL}/api/auctions/${auctionId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  if (!res.ok) {
    let message = 'No se pudo cerrar la venta';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/**
 * Crea una subasta (producto + subasta).
 * @param {{ token: string, auction: object }} params
 */
export async function createAuction({ token, auction }) {
  const res = await fetch(`${API_URL}/api/auctions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(auction),
  });
  if (!res.ok) {
    let message = 'No se pudo crear la subasta';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso: se usa el mensaje por defecto
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

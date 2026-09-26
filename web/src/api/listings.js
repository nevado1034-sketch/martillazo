/**
 * Capa de anuncios.
 * MVP: datos mock + localStorage vía MarketplaceContext.
 * Futuro: GET/POST /api/listings
 */
import { MOCK_LISTINGS } from '../data/mockListings.js';

export async function fetchListings({ tipo, q } = {}) {
  let items = [...MOCK_LISTINGS];
  if (tipo === 'producto' || tipo === 'servicio') {
    items = items.filter((l) => l.type === tipo);
  }
  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    items = items.filter((l) =>
      `${l.title} ${l.description}`.toLowerCase().includes(needle),
    );
  }
  return items;
}

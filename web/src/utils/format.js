/** Formato de precios en soles peruanos (S/). */
export function formatPrice(amount, { mode } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const num = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
  const formatted = `S/ ${num}`;

  if (mode === 'hora') return `${formatted}/h`;
  if (mode === 'desde') return `Desde ${formatted}`;
  if (mode === 'fijo') return formatted;
  return formatted;
}

export function formatRating(rating) {
  return Number(rating).toFixed(1);
}

export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function relativeDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

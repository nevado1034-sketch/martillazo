export function formatPrice(amount, { mode, currency = 'EUR' } = {}) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  const formatted = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

  if (mode === 'hora') return `${formatted}/h`;
  if (mode === 'desde') return `Desde ${formatted}`;
  if (mode === 'fijo') return formatted;
  return formatted;
}

export function formatRating(rating) {
  return Number(rating).toFixed(1).replace('.', ',');
}

export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function relativeDay(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff <= 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

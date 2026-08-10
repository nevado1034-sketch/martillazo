const formatPEN = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
  minimumFractionDigits: 2,
});

export function formatPrice(value) {
  const n = Number(value);
  return Number.isFinite(n) ? formatPEN.format(n) : '—';
}

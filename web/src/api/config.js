/** Endpoints base — listo para conectar API real más adelante. */
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:4000';

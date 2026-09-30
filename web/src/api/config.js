/**
 * Base URL de la API.
 * Vacío = mismo origen (Vite proxy /api y /uploads → :4000). Ideal para Try Live / túnel.
 * En local directo a la API: VITE_API_BASE_URL=http://localhost:4000
 */
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) {
    // Reescribe host local de la API al origen actual (útil tras túnel / proxy)
    try {
      const u = new URL(path);
      if (
        (u.hostname === 'localhost' || u.hostname === '127.0.0.1') &&
        u.port === '4000'
      ) {
        return `${window.location.origin}${u.pathname}`;
      }
    } catch {
      /* ignore */
    }
    return path;
  }
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

export async function apiFetch(path, { token, method = 'GET', body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (formData) {
    payload = formData;
  } else if (body != null) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Error ${res.status}`);
    err.code = json?.error?.code;
    err.status = res.status;
    throw err;
  }
  return json.data !== undefined ? json.data : json;
}

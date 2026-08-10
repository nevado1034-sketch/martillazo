import { API_URL } from './config.js';

/**
 * Sube un archivo (foto o video) al backend. Usa FormData multipart;
 * no se fija Content-Type manualmente: el navegador agrega el boundary.
 * @param {{ token: string, kind: 'photo'|'video', file: File }} params
 */
async function uploadFile({ token, kind, file }) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_URL}/api/uploads/${kind}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let message = 'No se pudo subir el archivo';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data; // { url, kind, size }
}

export function uploadPhoto({ token, file }) {
  return uploadFile({ token, kind: 'photo', file });
}

export function uploadVideo({ token, file }) {
  return uploadFile({ token, kind: 'video', file });
}

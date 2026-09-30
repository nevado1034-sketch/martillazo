import { apiFetch } from './config.js';

export async function uploadPhoto(token, file) {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch('/api/uploads/photo', {
    token,
    method: 'POST',
    formData,
  });
}

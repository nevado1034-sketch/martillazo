import { apiFetch } from './config.js';

const SESSION_KEY = 'pulgasya:session';

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function register({ email, password, fullName, phone }) {
  return apiFetch('/api/auth/register', {
    method: 'POST',
    body: { email, password, fullName, phone },
  });
}

export async function login({ email, password }) {
  return apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export async function fetchMe(token) {
  return apiFetch('/api/auth/me', { token });
}

export async function updateMe(token, input) {
  return apiFetch('/api/auth/me', { token, method: 'PATCH', body: input });
}

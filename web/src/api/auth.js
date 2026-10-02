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

export async function changePassword(token, { currentPassword, newPassword }) {
  return apiFetch('/api/auth/change-password', {
    token,
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export async function deactivateAccount(token, { password, confirm }) {
  return apiFetch('/api/auth/deactivate', {
    token,
    method: 'POST',
    body: { password, confirm },
  });
}

export async function forgotPassword(email) {
  return apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword({ token, newPassword }) {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
}

export async function submitKyc(token, input) {
  return apiFetch('/api/auth/kyc', {
    token,
    method: 'POST',
    body: input,
  });
}

export async function fetchPaymentGateway() {
  return apiFetch('/api/payments/gateway');
}

export async function fetchOauthProviders() {
  return apiFetch('/api/auth/oauth/providers');
}

/** Intercambia ticket OAuth de corta vida por sesión JWT. */
export async function exchangeOauthCode(code) {
  return apiFetch('/api/auth/oauth/exchange', {
    method: 'POST',
    body: { code },
  });
}

export async function connectPaymentGateway(token, provider) {
  return apiFetch('/api/payments/gateway/connect', {
    token,
    method: 'POST',
    body: { provider },
  });
}

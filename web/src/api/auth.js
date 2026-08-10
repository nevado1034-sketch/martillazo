import { API_URL } from './config.js';

export const DEMO_SESSION_KEY = 'martillazo_session';

/**
 * Login/registro con proveedor social (Google/Facebook).
 * En desarrollo el backend simula el proveedor; en producción este perfil
 * provendría del callback OAuth. Un correo nuevo crea el cliente en `users`.
 * @param {{ provider: string, email: string, fullName: string, phone?: string, avatarUrl?: string }} params
 */
export async function socialLogin({ provider, email, fullName, phone, avatarUrl }) {
  const res = await fetch(`${API_URL}/api/auth/social/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName, phone, avatarUrl }),
  });
  if (!res.ok) {
    let message = 'No se pudo iniciar sesión';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso: mensaje por defecto
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data; // { token, user }
}

/** Cuentas demo que simulan el perfil que devolvería cada proveedor. */
export const SOCIAL_DEMO_ACCOUNTS = {
  google: {
    provider: 'google',
    email: 'comprador@martillazo.pe',
    fullName: 'Juan Comprador',
    phone: '+51999990002',
  },
  facebook: {
    provider: 'facebook',
    email: 'vendedor@martillazo.pe',
    fullName: 'María Vendedora',
    phone: '+51999990001',
  },
  instagram: {
    provider: 'instagram',
    email: 'instagram@martillazo.pe',
    fullName: 'Camila García',
    phone: '+51999990004',
  },
};

export const PROVIDER_LABELS = {
  google: 'Google',
  facebook: 'Facebook',
  instagram: 'Instagram',
  register: 'Correo',
};

export function loadDemoSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(DEMO_SESSION_KEY) ?? 'null');
    if (!raw?.token) return null;
    const userId = raw.userId ?? raw.user?.id ?? null;
    return { token: raw.token, userId, user: raw.user ?? null };
  } catch {
    return null;
  }
}

export function saveDemoSession(session) {
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
}

/** Perfil completo del cliente autenticado. */
export async function fetchMe(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudo cargar tu perfil');
  const { data } = await res.json();
  return data;
}

/** Actualiza los datos editables del perfil. */
export async function updateProfile(token, { fullName, phone, avatarUrl }) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fullName, phone, avatarUrl }),
  });
  if (!res.ok) {
    let message = 'No se pudo actualizar tu perfil';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

/** Solicita la verificación de identidad (KYC). */
export async function requestKyc(token) {
  const res = await fetch(`${API_URL}/api/auth/kyc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: '{}',
  });
  if (!res.ok) {
    let message = 'No se pudo solicitar la verificación';
    try {
      const { error } = await res.json();
      if (error?.message) message = error.message;
    } catch {
      // silencioso
    }
    throw new Error(message);
  }
  const { data } = await res.json();
  return data;
}

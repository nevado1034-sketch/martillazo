import { API_URL } from './config.js';

/** Estado de la billetera: saldo, retenciones y últimos movimientos. */
export async function fetchWalletState(token) {
  const res = await fetch(`${API_URL}/api/wallet`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = 'No se pudo cargar tu billetera';
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

/**
 * Recarga la billetera.
 * - YAPE / PLIN: se verifica el código de operación.
 * - CARD: cobro simulado a la tarjeta (mock en desarrollo).
 */
export async function topupWallet({ token, amount, method, referenceCode }) {
  const res = await fetch(`${API_URL}/api/wallet/topup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount, method, referenceCode }),
  });
  if (!res.ok) {
    let message = 'No se pudo procesar la recarga';
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

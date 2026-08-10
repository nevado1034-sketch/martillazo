import { AppError } from '../utils/errors.js';

/**
 * Manejo de dinero en unidades menores (céntimos) para evitar errores de
 * punto flotante. Regla fintech: nunca sumar/restar montos en float.
 */

const MINOR_DIGITS = { PEN: 2, USD: 2, EUR: 2 };

export function minorDigits(currency) {
  const digits = MINOR_DIGITS[currency?.toUpperCase()];
  if (digits === undefined) {
    throw new AppError({
      code: 'UNSUPPORTED_CURRENCY',
      message: `Moneda no soportada: ${currency}`,
      status: 422,
    });
  }
  return digits;
}

/** Convierte un monto mayor (ej. 1.5) a unidades menores (150 céntimos). */
export function toMinorUnits(amount, currency = 'PEN') {
  const digits = minorDigits(currency);
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    throw new AppError({
      code: 'INVALID_AMOUNT',
      message: 'El monto es inválido',
      status: 422,
    });
  }
  return Math.round(value * 10 ** digits);
}

/** Convierte unidades menores (150) a monto mayor (1.5). */
export function toMajorUnits(cents, currency = 'PEN') {
  const digits = minorDigits(currency);
  return Number((cents / 10 ** digits).toFixed(digits));
}

/** Redondeo bancario a céntimo entero (mitad hacia arriba). */
export function roundCents(value) {
  return Math.round(value);
}

/** Valida que un monto en céntimos sea un entero positivo. */
export function assertPositiveCents(cents, { code = 'INVALID_AMOUNT' } = {}) {
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new AppError({
      code,
      message: 'El monto debe ser un entero positivo en unidades menores',
      status: 422,
    });
  }
  return cents;
}

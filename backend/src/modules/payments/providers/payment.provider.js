import { AppError } from '../../../utils/errors.js';

export class PaymentProviderError extends AppError {
  constructor({ provider, operation, message }) {
    super({
      code: 'PAYMENT_PROVIDER_ERROR',
      status: 502,
      message,
      details: { provider, operation },
    });
  }
}

/**
 * Contrato de un proveedor de pagos.
 * Implementaciones: MockProvider (desarrollo), y en producción
 * Stripe / Culqi / Niubiz (cada uno con su SDK).
 *
 * Todos los montos se expresan SIEMPRE en unidades menores (céntimos).
 */
export class PaymentProvider {
  /** Cobro único (compra del ganador, tarifa de publicación, penalidad). */
  async charge() {
    throw new Error('Not implemented');
  }

  /** Devolución de un cobro. */
  async refund() {
    throw new Error('Not implemented');
  }

  /** Pago a destino (vendedor, soporte). */
  async payout() {
    throw new Error('Not implemented');
  }

  /** Pre-autorización (hold) de una tarjeta: no debita, solo reserva. */
  async authorize() {
    throw new Error('Not implemented');
  }

  /** Captura definitiva de una pre-autorización (debita). */
  async capture() {
    throw new Error('Not implemented');
  }

  /** Libera una pre-autorización sin cargos. */
  async releaseAuthorization() {
    throw new Error('Not implemented');
  }
}

import { randomUUID } from 'node:crypto';
import { PaymentProvider } from './payment.provider.js';

const simulateLatency = (ms = 120) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Proveedor simulado para desarrollo. Misma interfaz que los proveedores
 * reales (Stripe/Culqi/Niubiz) para que el negocio no cambie al integrarlos.
 */
export class MockPaymentProvider extends PaymentProvider {
  name = 'MOCK';

  #ref(prefix) {
    return `${prefix}_${randomUUID()}`;
  }

  async charge({ amountCents, currency, sourceToken, idempotencyKey, reference }) {
    await simulateLatency();
    return {
      providerReference: this.#ref('chg'),
      status: 'SUCCEEDED',
      amountCents,
      currency,
      sourceToken,
      idempotencyKey,
      reference,
    };
  }

  async refund({ providerReference, amountCents, reason }) {
    await simulateLatency();
    return {
      providerReference: this.#ref('ref'),
      originalReference: providerReference,
      status: 'SUCCEEDED',
      amountCents,
      reason,
    };
  }

  async payout({ amountCents, currency, destinationAccountId, reference }) {
    await simulateLatency();
    return {
      providerReference: this.#ref('poy'),
      status: 'SUCCEEDED',
      amountCents,
      currency,
      destinationAccountId,
      reference,
    };
  }

  async authorize({ amountCents, currency, cardToken, reference }) {
    await simulateLatency();
    return {
      authorizationCode: this.#ref('auth'),
      status: 'AUTHORIZED',
      amountCents,
      currency,
      cardToken,
      reference,
    };
  }

  async capture({ authorizationCode, amountCents }) {
    await simulateLatency();
    return {
      providerReference: this.#ref('cap'),
      authorizationCode,
      status: 'CAPTURED',
      amountCents,
    };
  }

  async releaseAuthorization({ authorizationCode }) {
    await simulateLatency();
    return { authorizationCode, status: 'RELEASED' };
  }
}

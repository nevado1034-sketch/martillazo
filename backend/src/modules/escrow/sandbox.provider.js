import { randomUUID } from 'node:crypto';

/**
 * Proveedor sandbox de custodia PulgasYa.
 * Simula cobro/reembolso/webhook. NO usa PAN/CVV.
 * Cuando haya Culqi/Niubiz/MP, reemplazar esta clase manteniendo la misma interfaz.
 */
export class SandboxEscrowProvider {
  constructor() {
    this.name = 'SANDBOX';
  }

  async charge({ orderId, amountCents, currency = 'PEN', buyerId }) {
    const ref = `sandbox_chg_${randomUUID().slice(0, 12)}`;
    return {
      ok: true,
      provider: this.name,
      providerReference: ref,
      amountCents,
      currency,
      status: 'held',
      sandbox: true,
      label: 'Pago simulado — dinero en custodia PulgasYa (sandbox)',
      webhookShape: {
        type: 'payment.captured',
        data: {
          order_id: orderId,
          buyer_id: buyerId,
          amount_cents: amountCents,
          currency,
          provider_reference: ref,
          status: 'held',
        },
      },
    };
  }

  async refund({ orderId, amountCents, providerReference }) {
    const ref = `sandbox_ref_${randomUUID().slice(0, 12)}`;
    return {
      ok: true,
      provider: this.name,
      providerReference: ref,
      originalReference: providerReference,
      amountCents,
      status: 'refunded',
      sandbox: true,
      label: 'Reembolso simulado — sandbox PulgasYa',
      webhookShape: {
        type: 'payment.refunded',
        data: {
          order_id: orderId,
          amount_cents: amountCents,
          provider_reference: ref,
          status: 'refunded',
        },
      },
    };
  }

  async payout({ sellerId, amountCents, orderId }) {
    const ref = `sandbox_poy_${randomUUID().slice(0, 12)}`;
    return {
      ok: true,
      provider: this.name,
      providerReference: ref,
      amountCents,
      sellerId,
      orderId,
      status: 'paid_out',
      sandbox: true,
      label: 'Payout simulado al vendedor (ledger sandbox)',
    };
  }
}

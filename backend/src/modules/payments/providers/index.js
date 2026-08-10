import { MockPaymentProvider } from './mock.provider.js';

/**
 * Fábrica de proveedores. Para producción, registrar aquí las
 * implementaciones reales:
 *   case 'STRIPE': return new StripeProvider({ apiKey });
 *   case 'CULQI':  return new CulqiProvider({ publicKey, secretKey });
 *   case 'NIUBIZ': return new NiubizProvider({ clientId, clientSecret });
 */
export function getPaymentProvider(name = 'MOCK') {
  switch ((name ?? 'MOCK').toUpperCase()) {
    case 'MOCK':
      return new MockPaymentProvider();
    default:
      throw new Error(`Proveedor de pagos no registrado: ${name}`);
  }
}

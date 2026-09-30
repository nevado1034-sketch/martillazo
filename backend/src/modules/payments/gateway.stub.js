import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { env } from '../../config/env.js';

/**
 * Stubs de pasarela de pago para PulgasYa marketplace.
 * NO realizan cobros. Solo exponen estado de configuración y “conectar más tarde”.
 */
const SUPPORTED = ['MOCK', 'CULQI', 'NIUBIZ', 'MERCADOPAGO'];

function gatewayStatus() {
  const configured = (env.paymentProvider || 'MOCK').toUpperCase();
  const keys = {
    CULQI: Boolean(env.culqiPublicKey && env.culqiSecretKey),
    NIUBIZ: Boolean(env.niubizClientId && env.niubizClientSecret),
    MERCADOPAGO: Boolean(env.mercadopagoAccessToken),
  };
  return {
    activeProvider: configured,
    supported: SUPPORTED,
    readyToCharge: false,
    note:
      'PulgasYa MVP no cobra con tarjeta. Solo se guardan metadatos (marca, last4, vencimiento, titular). Conecta Culqi, Niubiz o Mercado Pago más adelante.',
    providers: SUPPORTED.map((name) => ({
      name,
      configured:
        name === 'MOCK'
          ? true
          : name === configured || Boolean(keys[name]),
      canCharge: false,
      envKeys:
        name === 'CULQI'
          ? ['CULQI_PUBLIC_KEY', 'CULQI_SECRET_KEY']
          : name === 'NIUBIZ'
            ? ['NIUBIZ_CLIENT_ID', 'NIUBIZ_CLIENT_SECRET']
            : name === 'MERCADOPAGO'
              ? ['MERCADOPAGO_ACCESS_TOKEN']
              : ['PAYMENT_PROVIDER=MOCK'],
    })),
  };
}

export function createGatewayStubRouter() {
  const router = Router();

  router.get('/gateway', (_req, res) => {
    res.json({ data: gatewayStatus() });
  });

  router.post('/gateway/connect', authenticate, (req, res) => {
    const wanted = String(req.body?.provider || '')
      .trim()
      .toUpperCase();
    if (!SUPPORTED.includes(wanted) || wanted === 'MOCK') {
      return res.status(422).json({
        error: {
          code: 'INVALID_PROVIDER',
          message: 'Elige Culqi, Niubiz o Mercado Pago',
        },
      });
    }
    return res.status(202).json({
      data: {
        status: 'pending_credentials',
        provider: wanted,
        message:
          'Pasarela registrada como preferencia. Añade las claves en el servidor y vuelve a conectar. No se realizará ningún cobro todavía.',
        nextSteps: [
          `Configura las variables de entorno de ${wanted}`,
          'Reinicia la API',
          'Activa PAYMENT_PROVIDER cuando el SDK esté integrado',
        ],
      },
    });
  });

  return router;
}

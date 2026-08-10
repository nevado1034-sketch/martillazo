import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createGuaranteesRouter(controller) {
  const router = Router();

  // Pre-autorización (hold) de la tarjeta para habilitar la puja en PREMIUM.
  router.post('/hold', authenticate, controller.hold);

  // Liberación sin cargos (perdió la subasta).
  router.post('/:holdId/release', authenticate, controller.release);

  // El ganador firmó: la garantía se abona al pago inicial.
  router.post('/:holdId/apply-to-down-payment', authenticate, controller.applyToDownPayment);

  // El ganador no firmó en el plazo: cobro de la garantía como penalidad (50/50).
  router.post('/:holdId/charge-penalty', authenticate, controller.chargePenalty);

  return router;
}

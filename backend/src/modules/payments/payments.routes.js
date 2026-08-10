import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createPaymentsRouter(controller) {
  const router = Router();

  // Pago del ganador (flujo estándar) -> queda en HOLD_ESCROW.
  // Requiere cabecera `Idempotency-Key` para evitar dobles cobros.
  router.post('/standard/process', authenticate, controller.processStandard);

  // Liberación de la custodia al vendedor (sistema/soporte), descontando
  // la comisión de la plataforma.
  router.post('/escrow/release', authenticate, controller.release);

  // Congela la custodia por disputa.
  router.post('/escrow/dispute', authenticate, controller.dispute);

  // Reembolso total al comprador.
  router.post('/escrow/refund', authenticate, controller.refund);

  return router;
}

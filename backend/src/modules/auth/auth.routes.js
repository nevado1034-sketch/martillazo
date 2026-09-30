import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createAuthRouter(controller) {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/social/:provider', controller.socialLogin);

  router.post('/forgot-password', controller.forgotPassword);
  router.post('/reset-password', controller.resetPassword);

  router.get('/me', authenticate, controller.me);
  router.patch('/me', authenticate, controller.updateMe);
  router.post('/change-password', authenticate, controller.changePassword);
  router.post('/deactivate', authenticate, controller.deactivate);

  // KYC / DNI
  router.post('/kyc', authenticate, controller.submitKyc);
  router.post('/kyc/request', authenticate, controller.requestKyc);

  return router;
}

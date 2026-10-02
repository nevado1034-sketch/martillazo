import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

export function createAuthRouter(controller) {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);

  // OAuth 2.0 / OpenID (Google, Facebook)
  router.get('/oauth/providers', controller.oauthProviders);
  router.post('/oauth/exchange', controller.oauthExchange);
  router.get('/oauth/:provider', controller.oauthStart);
  router.get('/oauth/:provider/callback', controller.oauthCallback);

  // Dev-only stub (bloqueado en production)
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

import { env } from '../../config/env.js';

export class AuthController {
  constructor(service) {
    this.service = service;
  }

  /**
   * POST /api/auth/social/:provider
   * Simulación de login social (Google/Facebook) en desarrollo. En producción
   * este endpoint debe redirigir al proveedor y el callback intercambiar el
   * `code`; el perfil resultante se pasa igual a service.loginWithSocial.
   */
  socialLogin = async (req, res, next) => {
    try {
      if (env.nodeEnv === 'production') {
        return res.status(501).json({
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'El flujo real de OAuth requiere credenciales del proveedor',
          },
        });
      }
      const { provider } = req.params;
      const { email, fullName, phone, avatarUrl } = req.body ?? {};
      const result = await this.service.loginWithSocial({
        provider,
        email,
        fullName,
        phone,
        avatarUrl,
      });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  me = async (req, res, next) => {
    try {
      const user = await this.service.getUserById(req.user.id);
      return res.json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  updateMe = async (req, res, next) => {
    try {
      const user = await this.service.updateProfile({
        userId: req.user.id,
        input: req.body ?? {},
      });
      return res.json({ data: user });
    } catch (err) {
      next(err);
    }
  };

  requestKyc = async (req, res, next) => {
    try {
      const user = await this.service.requestKyc({ userId: req.user.id });
      return res.json({ data: user });
    } catch (err) {
      next(err);
    }
  };
}

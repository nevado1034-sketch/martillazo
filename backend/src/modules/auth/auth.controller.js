import { env } from '../../config/env.js';

export class AuthController {
  constructor(service) {
    this.service = service;
  }

  register = async (req, res, next) => {
    try {
      const { email, password, fullName, phone } = req.body ?? {};
      const result = await this.service.register({
        email,
        password,
        fullName,
        phone,
      });
      return res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body ?? {};
      const result = await this.service.login({ email, password });
      return res.json({ data: result });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/social/:provider
   * Simulación de login social (Google/Facebook) en desarrollo.
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

  changePassword = async (req, res, next) => {
    try {
      const data = await this.service.changePassword({
        userId: req.user.id,
        currentPassword: req.body?.currentPassword,
        newPassword: req.body?.newPassword,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  deactivate = async (req, res, next) => {
    try {
      const data = await this.service.deactivateAccount({
        userId: req.user.id,
        password: req.body?.password,
        confirm: req.body?.confirm,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const data = await this.service.requestPasswordReset({
        email: req.body?.email,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const data = await this.service.resetPassword({
        token: req.body?.token,
        newPassword: req.body?.newPassword,
      });
      return res.json({ data });
    } catch (err) {
      next(err);
    }
  };

  submitKyc = async (req, res, next) => {
    try {
      const user = await this.service.submitKyc({
        userId: req.user.id,
        documentType: req.body?.documentType,
        documentNumber: req.body?.documentNumber,
        frontImageUrl: req.body?.frontImageUrl,
        backImageUrl: req.body?.backImageUrl,
        selfieImageUrl: req.body?.selfieImageUrl,
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

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';
import {
  OAUTH_PROVIDERS,
  buildAuthorizationUrl,
  exchangeAuthorizationCode,
  oauthConfigStatus,
} from './oauth.providers.js';

const STATE_TTL_SEC = 600;
const TICKET_TTL_SEC = 120;

function signOauthState(payload) {
  return jwt.sign({ ...payload, purpose: 'oauth_state' }, env.jwtSecret, {
    expiresIn: STATE_TTL_SEC,
  });
}

function verifyOauthState(token) {
  try {
    const data = jwt.verify(token, env.jwtSecret);
    if (data.purpose !== 'oauth_state') throw new Error('bad purpose');
    return data;
  } catch {
    throw new AppError({
      code: 'INVALID_OAUTH_STATE',
      message: 'Sesión OAuth inválida o caducada. Intenta de nuevo.',
      status: 400,
    });
  }
}

function signOauthTicket(userId) {
  return jwt.sign(
    { sub: userId, purpose: 'oauth_ticket' },
    env.jwtSecret,
    { expiresIn: TICKET_TTL_SEC },
  );
}

function verifyOauthTicket(token) {
  try {
    const data = jwt.verify(token, env.jwtSecret);
    if (data.purpose !== 'oauth_ticket' || !data.sub) {
      throw new Error('bad ticket');
    }
    return data;
  } catch {
    throw new AppError({
      code: 'INVALID_OAUTH_TICKET',
      message: 'El enlace para entrar caducó. Intenta de nuevo.',
      status: 400,
    });
  }
}

function resolveReturnOrigin(requested) {
  const fallback = env.clientOrigin;
  if (!requested) return fallback;
  try {
    const origin = new URL(String(requested)).origin;
    if (env.isAllowedOrigin(origin) || env.nodeEnv !== 'production') {
      return origin;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function frontendErrorRedirect(returnOrigin, code, message) {
  const params = new URLSearchParams({
    error: code,
    message: message || 'Error de autenticación social',
  });
  return `${returnOrigin.replace(/\/$/, '')}/oauth/callback?${params}`;
}

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

  /** GET /api/auth/oauth/providers — estado de configuración (soft-launch). */
  oauthProviders = async (_req, res) => {
    return res.json({ data: oauthConfigStatus() });
  };

  /**
   * GET /api/auth/oauth/:provider
   * Inicia authorization code flow. Query: returnOrigin (opcional).
   */
  oauthStart = async (req, res, next) => {
    try {
      const provider = String(req.params.provider || '')
        .trim()
        .toLowerCase();
      if (!OAUTH_PROVIDERS.includes(provider)) {
        throw new AppError({
          code: 'UNSUPPORTED_PROVIDER',
          message:
            provider === 'instagram'
              ? 'Instagram no ofrece login web estándar. Usa Facebook (Meta).'
              : `Proveedor no soportado: ${provider}`,
          status: 400,
        });
      }

      const returnOrigin = resolveReturnOrigin(
        req.query.returnOrigin || req.query.return_to,
      );
      const state = signOauthState({ provider, returnOrigin });
      const url = buildAuthorizationUrl(provider, { state });
      return res.redirect(302, url);
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/auth/oauth/:provider/callback
   * Intercambia code → perfil → usuario JWT ticket → redirect al front.
   */
  oauthCallback = async (req, res, next) => {
    let returnOrigin = env.clientOrigin;
    try {
      const provider = String(req.params.provider || '')
        .trim()
        .toLowerCase();
      const { code, state, error, error_description: errorDescription } =
        req.query ?? {};

      if (state) {
        try {
          const st = verifyOauthState(String(state));
          returnOrigin = resolveReturnOrigin(st.returnOrigin);
          if (st.provider && st.provider !== provider) {
            throw new AppError({
              code: 'INVALID_OAUTH_STATE',
              message: 'Proveedor OAuth no coincide',
              status: 400,
            });
          }
        } catch (err) {
          if (err instanceof AppError) throw err;
        }
      }

      if (error) {
        return res.redirect(
          302,
          frontendErrorRedirect(
            returnOrigin,
            'PROVIDER_DENIED',
            String(errorDescription || error),
          ),
        );
      }

      if (!code || !state) {
        return res.redirect(
          302,
          frontendErrorRedirect(
            returnOrigin,
            'MISSING_CODE',
            'Falta el código de autorización',
          ),
        );
      }

      // Re-verify state for CSRF (already parsed above if present)
      verifyOauthState(String(state));

      const profile = await exchangeAuthorizationCode(
        provider,
        String(code),
      );
      const result = await this.service.loginWithSocial({
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        emailVerified: profile.emailVerified,
        fullName: profile.fullName,
        avatarUrl: profile.avatarUrl,
      });

      const ticket = signOauthTicket(result.user.id);
      const params = new URLSearchParams({ code: ticket });
      return res.redirect(
        302,
        `${returnOrigin.replace(/\/$/, '')}/oauth/callback?${params}`,
      );
    } catch (err) {
      if (err instanceof AppError || err?.code) {
        return res.redirect(
          302,
          frontendErrorRedirect(
            returnOrigin,
            err.code || 'OAUTH_ERROR',
            err.message || 'Error OAuth',
          ),
        );
      }
      next(err);
    }
  };

  /**
   * POST /api/auth/oauth/exchange
   * Body: { code } — ticket de corta vida → sesión JWT + user.
   */
  oauthExchange = async (req, res, next) => {
    try {
      const ticket = String(req.body?.code ?? '').trim();
      if (!ticket) {
        throw new AppError({
          code: 'INVALID_OAUTH_TICKET',
          message: 'Código OAuth ausente',
          status: 400,
        });
      }
      const data = verifyOauthTicket(ticket);
      const user = await this.service.getUserById(data.sub);
      const token = jwt.sign(
        { sub: user.id, role: user.role },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn },
      );
      return res.json({ data: { token, user } });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/social/:provider
   * Solo desarrollo: simula perfil OAuth sin credenciales reales.
   */
  socialLogin = async (req, res, next) => {
    try {
      if (env.nodeEnv === 'production') {
        return res.status(501).json({
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message:
              'Usa GET /api/auth/oauth/:provider para el flujo OAuth real',
          },
        });
      }
      const provider = String(req.params.provider || '')
        .trim()
        .toLowerCase();
      if (provider === 'instagram') {
        throw new AppError({
          code: 'UNSUPPORTED_PROVIDER',
          message:
            'Instagram no ofrece login web estándar. Usa Facebook (Meta).',
          status: 400,
        });
      }
      const { email, fullName, phone, avatarUrl, providerUserId } =
        req.body ?? {};
      const result = await this.service.loginWithSocial({
        provider,
        providerUserId:
          providerUserId || `dev-${provider}-${String(email || 'anon')}`,
        email,
        emailVerified: true,
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

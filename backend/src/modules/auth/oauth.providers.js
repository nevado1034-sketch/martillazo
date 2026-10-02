import { env } from '../../config/env.js';
import { AppError } from '../../utils/errors.js';

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';

const FB_GRAPH = 'https://graph.facebook.com/v21.0';
const FB_DIALOG = 'https://www.facebook.com/v21.0/dialog/oauth';

export const OAUTH_PROVIDERS = ['google', 'facebook'];

export function oauthConfigStatus() {
  const google =
    Boolean(env.googleClientId) &&
    Boolean(env.googleClientSecret) &&
    Boolean(env.publicApiUrl);
  const facebook =
    Boolean(env.facebookAppId) &&
    Boolean(env.facebookAppSecret) &&
    Boolean(env.publicApiUrl);
  return {
    google: {
      enabled: google,
      label: 'Google',
      reason: google
        ? null
        : missingReason([
            !env.googleClientId && 'GOOGLE_CLIENT_ID',
            !env.googleClientSecret && 'GOOGLE_CLIENT_SECRET',
            !env.publicApiUrl && 'PUBLIC_API_URL',
          ]),
    },
    facebook: {
      enabled: facebook,
      label: 'Facebook',
      reason: facebook
        ? null
        : missingReason([
            !env.facebookAppId && 'FACEBOOK_APP_ID',
            !env.facebookAppSecret && 'FACEBOOK_APP_SECRET',
            !env.publicApiUrl && 'PUBLIC_API_URL',
          ]),
    },
    /** Instagram no ofrece Login with Instagram estándar para websites. */
    instagram: {
      enabled: false,
      label: 'Instagram',
      reason:
        'Instagram no ofrece “Login with Instagram” para sitios web. Usa Facebook (Meta).',
    },
    publicApiUrl: env.publicApiUrl || null,
  };
}

function missingReason(parts) {
  const missing = parts.filter(Boolean);
  if (!missing.length) return 'Configuración incompleta';
  return `Falta configurar: ${missing.join(', ')}`;
}

export function assertProviderConfigured(provider) {
  const status = oauthConfigStatus();
  const entry = status[provider];
  if (!entry?.enabled) {
    throw new AppError({
      code: 'OAUTH_NOT_CONFIGURED',
      message:
        entry?.reason ||
        `El inicio de sesión con ${provider} aún no está configurado`,
      status: 503,
    });
  }
}

export function oauthCallbackUrl(provider) {
  if (!env.publicApiUrl) {
    throw new AppError({
      code: 'OAUTH_NOT_CONFIGURED',
      message: 'PUBLIC_API_URL es obligatorio para OAuth',
      status: 503,
    });
  }
  return `${env.publicApiUrl}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizationUrl(provider, { state }) {
  assertProviderConfigured(provider);
  const redirectUri = oauthCallbackUrl(provider);

  if (provider === 'google') {
    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    return `${GOOGLE_AUTH}?${params}`;
  }

  if (provider === 'facebook') {
    const params = new URLSearchParams({
      client_id: env.facebookAppId,
      redirect_uri: redirectUri,
      state,
      scope: 'email,public_profile',
      response_type: 'code',
    });
    return `${FB_DIALOG}?${params}`;
  }

  throw new AppError({
    code: 'UNSUPPORTED_PROVIDER',
    message: `Proveedor no soportado: ${provider}`,
    status: 400,
  });
}

/**
 * Intercambia el authorization code por perfil normalizado.
 * @returns {{ provider, providerUserId, email, emailVerified, fullName, avatarUrl }}
 */
export async function exchangeAuthorizationCode(provider, code) {
  assertProviderConfigured(provider);
  const redirectUri = oauthCallbackUrl(provider);

  if (provider === 'google') {
    return exchangeGoogle(code, redirectUri);
  }
  if (provider === 'facebook') {
    return exchangeFacebook(code, redirectUri);
  }
  throw new AppError({
    code: 'UNSUPPORTED_PROVIDER',
    message: `Proveedor no soportado: ${provider}`,
    status: 400,
  });
}

async function exchangeGoogle(code, redirectUri) {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new AppError({
      code: 'OAUTH_TOKEN_ERROR',
      message: 'No se pudo validar el acceso con Google',
      status: 401,
      details: { provider: 'google', error: tokenJson.error },
    });
  }

  const profileRes = await fetch(GOOGLE_USERINFO, {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.sub) {
    throw new AppError({
      code: 'OAUTH_PROFILE_ERROR',
      message: 'No se pudo obtener el perfil de Google',
      status: 401,
    });
  }

  return {
    provider: 'google',
    providerUserId: String(profile.sub),
    email: profile.email ? String(profile.email).trim().toLowerCase() : null,
    emailVerified: profile.email_verified === true,
    fullName: String(profile.name || profile.given_name || 'Usuario Google').trim(),
    avatarUrl: profile.picture ? String(profile.picture) : null,
  };
}

async function exchangeFacebook(code, redirectUri) {
  const tokenParams = new URLSearchParams({
    client_id: env.facebookAppId,
    client_secret: env.facebookAppSecret,
    redirect_uri: redirectUri,
    code,
  });
  const tokenRes = await fetch(
    `${FB_GRAPH}/oauth/access_token?${tokenParams}`,
  );
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new AppError({
      code: 'OAUTH_TOKEN_ERROR',
      message: 'No se pudo validar el acceso con Facebook',
      status: 401,
      details: { provider: 'facebook', error: tokenJson.error },
    });
  }

  const profileParams = new URLSearchParams({
    fields: 'id,name,email,picture.type(large)',
    access_token: tokenJson.access_token,
  });
  const profileRes = await fetch(`${FB_GRAPH}/me?${profileParams}`);
  const profile = await profileRes.json().catch(() => ({}));
  if (!profileRes.ok || !profile.id) {
    throw new AppError({
      code: 'OAUTH_PROFILE_ERROR',
      message: 'No se pudo obtener el perfil de Facebook',
      status: 401,
    });
  }

  const email = profile.email
    ? String(profile.email).trim().toLowerCase()
    : null;
  const avatarUrl =
    profile.picture?.data?.url != null
      ? String(profile.picture.data.url)
      : null;

  return {
    provider: 'facebook',
    providerUserId: String(profile.id),
    email,
    // Facebook solo entrega email si el usuario lo autorizó y está verificado en Meta.
    emailVerified: Boolean(email),
    fullName: String(profile.name || 'Usuario Facebook').trim(),
    avatarUrl,
  };
}

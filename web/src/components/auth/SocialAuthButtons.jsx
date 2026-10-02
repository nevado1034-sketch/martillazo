import { useEffect, useState } from 'react';
import { API_BASE, apiFetch } from '../../api/config.js';

function oauthStartUrl(provider) {
  const base = (API_BASE || window.location.origin).replace(/\/$/, '');
  const returnOrigin = window.location.origin;
  const q = new URLSearchParams({ returnOrigin });
  return `${base}/api/auth/oauth/${provider}?${q}`;
}

export default function SocialAuthButtons({ disabled = false }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch('/api/auth/oauth/providers');
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus({
            google: { enabled: false, reason: 'No se pudo consultar la API' },
            facebook: { enabled: false, reason: 'No se pudo consultar la API' },
            instagram: {
              enabled: false,
              reason: 'Instagram no ofrece login web estándar',
            },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = (provider, enabled) => {
    if (!enabled || disabled) return;
    window.location.assign(oauthStartUrl(provider));
  };

  if (loading) {
    return (
      <div className="mt-4 space-y-2" aria-busy="true">
        <div className="h-11 animate-pulse rounded-xl bg-[var(--surface)]" />
        <div className="h-11 animate-pulse rounded-xl bg-[var(--surface)]" />
      </div>
    );
  }

  const google = status?.google ?? { enabled: false };
  const facebook = status?.facebook ?? { enabled: false };

  return (
    <div className="mt-4 space-y-2">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-[var(--ink-faint)]">
        Acceso rápido
      </p>
      <SocialButton
        provider="google"
        label="Continuar con Google"
        enabled={Boolean(google.enabled)}
        reason={google.reason}
        disabled={disabled}
        onClick={() => start('google', google.enabled)}
      />
      <SocialButton
        provider="facebook"
        label="Continuar con Facebook"
        enabled={Boolean(facebook.enabled)}
        reason={facebook.reason}
        disabled={disabled}
        onClick={() => start('facebook', facebook.enabled)}
      />
      <p className="text-center text-[11px] leading-snug text-[var(--ink-faint)]">
        Instagram no permite entrar desde la web; usa Facebook (misma cuenta Meta)
        si entras con Meta.
      </p>
    </div>
  );
}

function SocialButton({
  provider,
  label,
  enabled,
  reason,
  disabled,
  onClick,
}) {
  const soon = !enabled;
  const title = soon
    ? reason || 'Próximamente — falta configurar credenciales'
    : label;

  return (
    <button
      type="button"
      title={title}
      disabled={disabled || soon}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
        soon
          ? 'cursor-not-allowed border-[var(--line)] bg-[var(--surface)] text-[var(--ink-faint)]'
          : provider === 'google'
            ? 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--primary-celeste)] hover:bg-[var(--mint-wash)]'
            : 'border-[#1877F2]/35 bg-[#1877F2] text-white hover:brightness-95'
      } disabled:opacity-60`}
    >
      {provider === 'google' ? <GoogleIcon /> : <FacebookIcon />}
      <span className="flex-1 text-left sm:text-center">
        {soon ? `${label} · Próximamente` : label}
      </span>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.03H7.9v-2.9h2.4V9.84c0-2.37 1.4-3.69 3.56-3.69 1.03 0 2.12.19 2.12.19v2.33h-1.2c-1.18 0-1.55.73-1.55 1.48v1.78h2.64l-.42 2.9h-2.22V22c4.78-.75 8.44-4.91 8.44-9.93z" />
    </svg>
  );
}

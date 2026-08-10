import { useState } from 'react';
import { SOCIAL_DEMO_ACCOUNTS, socialLogin } from '../api/auth.js';

const PROVIDERS = [
  {
    key: 'google',
    label: 'Continuar con Google',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
        />
      </svg>
    ),
  },
  {
    key: 'facebook',
    label: 'Continuar con Facebook',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
        <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
      </svg>
    ),
  },
  {
    key: 'instagram',
    label: 'Continuar con Instagram',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="ig" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="50%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#8134AF" />
          </linearGradient>
        </defs>
        <rect width="20" height="20" x="2" y="2" rx="5" fill="none" stroke="url(#ig)" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="url(#ig)" strokeWidth="2" />
        <circle cx="17.3" cy="6.7" r="1.3" fill="#DD2A7B" />
      </svg>
    ),
  },
];

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Login/registro social (Google/Facebook) y registro con otro correo.
 * Cada cuenta nueva queda registrada como cliente en el sistema.
 */
export default function LoginModal({ open, onClose, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showRegister, setShowRegister] = useState(false);
  const [reg, setReg] = useState({ fullName: '', email: '', phone: '' });

  if (!open) return null;

  const set = (key) => (e) => setReg((prev) => ({ ...prev, [key]: e.target.value }));

  const login = async (params) => {
    setBusy(true);
    setError('');
    try {
      const session = await socialLogin(params);
      onSuccess({ ...session, provider: params.provider });
      onClose();
      setShowRegister(false);
      setReg({ fullName: '', email: '', phone: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    await login({
      provider: 'register',
      email: reg.email,
      fullName: reg.fullName,
      phone: reg.phone,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Ingresar</h2>
            <p className="text-sm text-slate-500">
              Entra con tu cuenta para pujar o publicar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              disabled={busy}
              onClick={() => login(SOCIAL_DEMO_ACCOUNTS[p.key])}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60"
            >
              {p.icon}
              {p.label}
            </button>
          ))}
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          o
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {!showRegister ? (
          <button
            type="button"
            onClick={() => setShowRegister(true)}
            className="w-full text-center text-sm font-semibold text-brand-600 hover:underline"
          >
            ¿No tienes cuenta? Regístrate con tu correo
          </button>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className={labelCls}>Nombre completo</label>
              <input
                className={inputCls}
                value={reg.fullName}
                onChange={set('fullName')}
                placeholder="Ej: Luis Pérez"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Correo</label>
              <input
                className={inputCls}
                type="email"
                value={reg.email}
                onChange={set('email')}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Celular (para concretar la venta)</label>
              <input
                className={inputCls}
                value={reg.phone}
                onChange={set('phone')}
                placeholder="+51 999 999 999"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {busy ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

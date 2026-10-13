import { useEffect, useId, useState } from 'react';
import {
  auth,
  googleProvider,
  hasConfig,
  signInWithPopup,
} from '../../firebase.js';
import { useAuth } from '../../store/AuthContext.jsx';
import { useToast } from '../ui/Toast.jsx';

export default function AuthModal() {
  const { authOpen, setAuthOpen, authIntent, login, loginWithGoogle, register } = useAuth();
  const { push } = useToast();
  const titleId = useId();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('51');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authOpen) {
      setMode(authIntent === 'publish' || authIntent === 'register' ? 'register' : 'login');
      setError('');
      setPassword('');
    }
  }, [authOpen, authIntent]);

  if (!authOpen) return null;

  const intentLabel =
    authIntent === 'publish'
      ? 'Inicia sesión para publicar'
      : authIntent === 'offer'
        ? 'Inicia sesión para proponer un precio'
        : 'Entra a PulgasYa';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') {
        await login({ email, password });
        push('Sesión iniciada');
      } else {
        await register({ email, password, fullName, phone });
        push('Cuenta creada');
      }
      setAuthOpen(false);
    } catch (err) {
      setError(err.message || 'No se pudo completar');
    } finally {
      setBusy(false);
    }
  };

  const loginGoogle = async () => {
    if (!hasConfig) {
      setError('Falta configurar VITE_FIREBASE_* en el .env del front');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      await loginWithGoogle(idToken);
      setAuthOpen(false);
      push('Sesión iniciada');
    } catch (err) {
      if (err?.code === 'auth/popup-closed-by-user') return;
      setError(err.message || 'No se pudo iniciar con Google');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/45 animate-fade-in"
        aria-label="Cerrar"
        onClick={() => setAuthOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--line)] bg-white p-5 shadow-2xl animate-modal-up sm:rounded-2xl"
      >
        <h2 id={titleId} className="font-display text-xl font-bold text-[var(--ink)]">
          {intentLabel}
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {mode === 'login'
            ? 'Usa el correo con el que te registraste.'
            : 'Necesitas WhatsApp para que compradores y vendedores se contacten.'}
        </p>

        <div className="mt-4 flex gap-2 rounded-xl bg-[var(--surface)] p-1">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === 'login' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-[var(--ink-muted)]'
            }`}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              mode === 'register' ? 'bg-white text-[var(--brand)] shadow-sm' : 'text-[var(--ink-muted)]'
            }`}
            onClick={() => setMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        <button
          type="button"
          onClick={loginGoogle}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--line)] bg-white py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-60"
        >
          <GoogleIcon />
          Continuar con Google
        </button>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs text-[var(--ink-faint)]">o</span>
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === 'register' && (
            <>
              <Field label="Nombre" htmlFor="auth-name">
                <input
                  id="auth-name"
                  className="field-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </Field>
              <Field label="WhatsApp (con código 51)" htmlFor="auth-phone">
                <input
                  id="auth-phone"
                  className="field-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="51999888777"
                  required
                />
              </Field>
            </>
          )}
          <Field label="Correo" htmlFor="auth-email">
            <input
              id="auth-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          <Field label="Contraseña" htmlFor="auth-pass">
            <input
              id="auth-pass"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </Field>
          {error && <p className="text-sm text-[var(--coral-deep)]">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--primary-celeste)] py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
          >
            {busy ? 'Espera…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
          {mode === 'login' && (
            <p className="text-center text-xs text-[var(--ink-faint)]">
              <a
                href="/recuperar"
                className="text-[var(--primary-celeste)] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthOpen(false);
                  window.location.href = '/recuperar';
                }}
              >
                ¿Olvidaste tu contraseña?
              </a>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

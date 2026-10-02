import { useEffect, useId, useState } from 'react';
import { useAuth } from '../../store/AuthContext.jsx';
import { useToast } from '../ui/Toast.jsx';
import SocialAuthButtons from './SocialAuthButtons.jsx';

export default function AuthModal() {
  const { authOpen, setAuthOpen, authIntent, login, register } = useAuth();
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
            ? 'Usa el correo con el que te registraste o un acceso rápido.'
            : 'Necesitas WhatsApp para que compradores y vendedores se contacten. También puedes usar Google o Facebook.'}
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

        <SocialAuthButtons disabled={busy} />

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--line)]" />
          <span className="text-xs font-medium text-[var(--ink-faint)]">o con correo</span>
          <div className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <form onSubmit={submit} className="space-y-3">
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

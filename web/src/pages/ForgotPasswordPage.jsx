import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { forgotPassword } from '../api/auth.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    setDevUrl('');
    try {
      const data = await forgotPassword(email);
      setMsg(
        data.message ||
          'Si el correo existe, te enviamos instrucciones.',
      );
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      setError(err.message || 'No se pudo enviar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Te enviaremos un enlace por correo. En desarrollo, si no hay SMTP, el
          servidor lo imprime en consola y aquí mostramos el enlace de prueba.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm font-medium" htmlFor="fp-email">
            Correo
          </label>
          <input
            id="fp-email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          {error && (
            <p className="text-sm text-[var(--coral-deep)]">{error}</p>
          )}
          {msg && (
            <p className="rounded-lg bg-[var(--mint-wash)] px-3 py-2 text-sm">
              {msg}
            </p>
          )}
          {devUrl && (
            <p className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs">
              Enlace de desarrollo:{' '}
              <a
                href={devUrl}
                className="font-semibold text-[var(--primary-celeste)] break-all hover:underline"
              >
                {devUrl}
              </a>
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[var(--cta-orange)] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
        <p className="mt-6 text-sm">
          <Link to="/entrar" className="text-[var(--primary-celeste)] hover:underline">
            Volver a entrar
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

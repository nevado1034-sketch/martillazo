import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { resetPassword } from '../api/auth.js';
import { useToast } from '../components/ui/Toast.jsx';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { push } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await resetPassword({ token, newPassword: password });
      push('Contraseña restablecida');
      navigate('/entrar');
    } catch (err) {
      setError(err.message || 'Enlace inválido o caducado');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Nueva contraseña</h1>
        {!token ? (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">
            Falta el token del enlace.{' '}
            <Link to="/recuperar" className="text-[var(--primary-celeste)] hover:underline">
              Solicitar uno nuevo
            </Link>
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block text-sm font-medium" htmlFor="rp-pass">
              Nueva contraseña
            </label>
            <input
              id="rp-pass"
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            <label className="block text-sm font-medium" htmlFor="rp-conf">
              Confirmar
            </label>
            <input
              id="rp-conf"
              type="password"
              className="field-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
            {error && (
              <p className="text-sm text-[var(--coral-deep)]">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[var(--primary-celeste)] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </button>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

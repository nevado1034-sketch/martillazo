import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';

/** Recibe el ticket OAuth del API y completa la sesión JWT. */
export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { completeOauth } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const errCode = params.get('error');
    const errMsg = params.get('message');
    const code = params.get('code');

    async function run() {
      if (errCode) {
        if (!cancelled) {
          setError(errMsg || 'No se pudo completar el acceso social');
        }
        return;
      }
      if (!code) {
        if (!cancelled) setError('Falta el código de autorización');
        return;
      }
      try {
        await completeOauth(code);
        if (!cancelled) {
          push('Sesión iniciada');
          navigate('/', { replace: true });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'No se pudo completar el acceso social');
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [params, completeOauth, navigate, push]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--primary-celeste)]">
          PulgasYa
        </h1>
        {error ? (
          <>
            <p className="mt-4 text-sm text-[var(--coral-deep)]">{error}</p>
            <Link
              to="/entrar"
              className="mt-6 inline-block rounded-xl bg-[var(--primary-celeste)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Volver a entrar
            </Link>
          </>
        ) : (
          <p className="mt-4 text-sm text-[var(--ink-muted)]">
            Completando acceso seguro…
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

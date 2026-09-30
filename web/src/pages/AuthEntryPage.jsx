import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';

/** Abre el modal de auth en modo registro/login y vuelve al home. */
export default function AuthEntryPage({ mode = 'register' }) {
  const { setAuthOpen, setAuthIntent, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
      return;
    }
    setAuthIntent(mode === 'login' ? null : 'register');
    setAuthOpen(true);
  }, [user, mode, navigate, setAuthOpen, setAuthIntent]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-[var(--primary-celeste)]">
          {mode === 'login' ? 'Entrar a PulgasYa' : 'Crear cuenta en PulgasYa'}
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-muted)]">
          {mode === 'login'
            ? 'Usa el formulario para iniciar sesión.'
            : 'Completa el registro con correo, contraseña y WhatsApp (código 51).'}
        </p>
        <button
          type="button"
          className="mx-auto mt-6 rounded-xl bg-[var(--primary-celeste)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          onClick={() => setAuthOpen(true)}
        >
          {mode === 'login' ? 'Abrir inicio de sesión' : 'Abrir registro'}
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}

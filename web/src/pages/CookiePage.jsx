import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

/** Nota breve de cookies (enlace desde banner / privacidad). */
export default function CookiePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Cookies</h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--ink)]">
          PulgasYa usa almacenamiento local del navegador para mantener tu
          sesión y preferencias esenciales. No usamos cookies de publicidad de
          terceros en este MVP. Más detalle en la{' '}
          <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
            política de privacidad
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

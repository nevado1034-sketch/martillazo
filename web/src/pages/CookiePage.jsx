import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

/** Nota de cookies (enlace desde banner / privacidad). */
export default function CookiePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Política de cookies</h1>
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          Última actualización: octubre de 2026.
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <p>
            PulgasYa utiliza almacenamiento local del navegador y cookies
            esenciales para mantener tu sesión iniciada y recordar tus
            preferencias básicas. Estas tecnologías son necesarias para el
            funcionamiento del Servicio.
          </p>
          <p>
            <strong>Cookies y almacenamiento esenciales:</strong> sesión de
            usuario, preferencias de la interfaz y seguridad. No usamos cookies
            de publicidad de terceros ni realizamos seguimiento con fines
            publicitarios.
          </p>
          <p>
            La mayoría de los navegadores permiten bloquear o eliminar cookies y
            el almacenamiento local desde su configuración; sin embargo, si lo
            haces, algunas funciones del Servicio (como mantener la sesión)
            podrían dejar de funcionar.
          </p>
          <p>
            Para más información sobre el tratamiento de tus datos, consulta
            nuestra{' '}
            <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
              política de privacidad
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

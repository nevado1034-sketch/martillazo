import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

const SUPPORT = 'soporte@pulgasya.com';
// Configura VITE_SUPPORT_WHATSAPP con el número real (solo dígitos, con 51).
const WA = (import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold text-[var(--text-dark)]">
          Ayuda y contacto
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Soporte PulgasYa — marketplace de segunda mano y servicios en Perú.
        </p>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <h2 className="font-display text-lg font-bold text-[var(--primary-celeste)]">
            ¿Cómo te ayudamos?
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Publicar productos o servicios:{' '}
              <Link to="/publicar" className="text-[var(--primary-celeste)] hover:underline">
                /publicar
              </Link>
            </li>
            <li>
              Gestionar ofertas recibidas:{' '}
              <Link to="/mis-ventas" className="text-[var(--primary-celeste)] hover:underline">
                Mis ventas
              </Link>
            </li>
            <li>
              Cuenta, tarjeta (solo last4) e identidad:{' '}
              <Link to="/configuracion" className="text-[var(--primary-celeste)] hover:underline">
                Configuración
              </Link>
            </li>
            <li>
              Recuperar contraseña:{' '}
              <Link to="/recuperar" className="text-[var(--primary-celeste)] hover:underline">
                /recuperar
              </Link>
            </li>
          </ul>
        </section>

        <section
          id="custodia"
          className="mt-8 scroll-mt-24 rounded-2xl border border-[var(--line)] bg-white p-5"
        >
          <h2 className="font-display text-lg font-bold text-[var(--primary-celeste)]">
            Cómo funciona la custodia PulgasYa
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--ink)]">
            <li>Pagas dentro de PulgasYa al confirmar la compra.</li>
            <li>PulgasYa retiene el dinero y avisa al vendedor.</li>
            <li>
              Cuando confirmas que recibiste el producto o servicio, el dinero se
              libera al vendedor.
            </li>
          </ol>
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            La comisión de PulgasYa es del 10% y se descuenta al liberar el pago.
            Si algo sale mal, escríbenos antes de confirmar la entrega.
          </p>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="font-display text-lg font-bold text-[var(--cta-orange)]">
            Contacto soporte
          </h2>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Escríbenos en horario de atención (Lun–Vie 9:00–18:00, hora Perú).
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <a
              href={`mailto:${SUPPORT}?subject=Ayuda%20PulgasYa`}
              className="rounded-xl bg-[var(--primary-celeste)] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Escribir a {SUPPORT}
            </a>
            {WA && (
              <a
                href={`https://wa.me/${WA}?text=${encodeURIComponent('Hola PulgasYa, necesito ayuda con mi cuenta.')}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[var(--cta-orange)] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                WhatsApp de soporte
              </a>
            )}
          </div>
          <p className="mt-3 text-xs text-[var(--ink-muted)]">
            Correo oficial:{' '}
            <a
              href={`mailto:${SUPPORT}`}
              className="font-medium text-[var(--primary-celeste)] hover:underline"
            >
              {SUPPORT}
            </a>
          </p>
        </section>

        <p className="mt-8 text-sm">
          <Link to="/terminos" className="text-[var(--primary-celeste)] hover:underline">
            Términos
          </Link>
          {' · '}
          <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
            Privacidad
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

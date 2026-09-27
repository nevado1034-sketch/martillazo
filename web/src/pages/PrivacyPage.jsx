import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">
          Política de privacidad
        </h1>
        <p className="mt-2 text-xs text-[var(--ink-faint)]">
          MVP PulgasYa — Perú · septiembre 2026. Orientativo; [revisar con
          abogado / DPD antes de producción]. Aplicable a la Ley de Protección
          de Datos Personales (Ley N.º 29733) y su reglamento.
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <H>1. Responsable</H>
          <P>
            El tratamiento de datos personales en PulgasYa se realiza para
            operar el marketplace (cuenta, anuncios, ofertas y contacto entre
            usuarios). Contacto:{' '}
            <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
              soporte
            </Link>
            .
          </P>

          <H>2. Datos que tratamos</H>
          <ul className="list-disc space-y-1 pl-5">
            <li>Identificación: nombre, correo, teléfono/WhatsApp, dirección.</li>
            <li>Cuenta: contraseña (hash), foto de perfil, preferencias.</li>
            <li>
              Identidad (opcional): tipo/número de documento e imágenes KYC en
              estado pendiente/verificado.
            </li>
            <li>
              Pagos (MVP): marca, últimos 4 dígitos, vencimiento y titular —
              <strong> nunca</strong> el PAN completo ni el CVV.
            </li>
            <li>Uso: anuncios, ofertas, registros técnicos de seguridad.</li>
          </ul>

          <H>3. Finalidades</H>
          <P>
            Crear y administrar tu cuenta; mostrar anuncios; permitir contacto
            según tu preferencia de visibilidad del teléfono; enviar
            notificaciones si las activas; prevenir fraude; cumplir
            obligaciones legales.
          </P>

          <H>4. Visibilidad del teléfono</H>
          <P>
            Puedes elegir si tu WhatsApp es público, visible solo a quien oferte,
            o a nadie. Respeta esta configuración al contactar a otros usuarios.
          </P>

          <H>5. Conservación y cierre de cuenta</H>
          <P>
            Puedes solicitar el cierre de cuenta desde Configuración (soft-delete:
            desactivación y anonimización de datos personales razonables).
            Conservaremos información mínima necesaria por obligaciones legales
            o resolución de disputas.
          </P>

          <H>6. Derechos ARCO</H>
          <P>
            Puedes solicitar acceso, rectificación, cancelación u oposición
            respecto de tus datos personales contactando a soporte, sujeto a
            verificación de identidad.
          </P>

          <H>7. Cookies</H>
          <P>
            Usamos almacenamiento local para sesión y preferencias esenciales
            del sitio. No vendemos datos personales a terceros con fines
            publicitarios en este MVP.
          </P>

          <H>8. Transferencias y seguridad</H>
          <P>
            En producción se recomienda HTTPS, copias de seguridad de la base de
            datos y almacenamiento persistente de fotos. Ver notas de operaciones
            del proyecto.
          </P>
        </div>

        <p className="mt-10 text-sm">
          <Link to="/terminos" className="text-[var(--primary-celeste)] hover:underline">
            Términos y condiciones
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

function H({ children }) {
  return (
    <h2 className="pt-2 font-display text-lg font-bold text-[var(--primary-celeste)]">
      {children}
    </h2>
  );
}

function P({ children }) {
  return <p>{children}</p>;
}

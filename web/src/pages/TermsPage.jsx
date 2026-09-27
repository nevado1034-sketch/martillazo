import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

export default function TermsPage() {
  return (
    <LegalShell title="Términos y condiciones">
      <p className="text-xs text-[var(--ink-faint)]">
        Versión MVP — Perú · Última actualización: septiembre 2026. Este texto
        es orientativo para el producto PulgasYa; no sustituye asesoría legal
        formal. [Revisar con abogado antes de producción.]
      </p>

      <H>1. Quiénes somos</H>
      <P>
        PulgasYa es una plataforma digital que facilita el encuentro entre
        personas que ofrecen productos de segunda mano o servicios y personas
        interesadas en comprarlos o contratarlos en el territorio peruano. No
        somos parte del contrato de compraventa ni prestamos el servicio
        anunciado, salvo que se indique expresamente lo contrario.
      </P>

      <H>2. Cuenta y elegibilidad</H>
      <P>
        Debes ser mayor de edad según la legislación peruana y proporcionar
        datos veraces (nombre, correo, WhatsApp). Eres responsable de la
        confidencialidad de tu contraseña y de la actividad en tu cuenta.
      </P>

      <H>3. Publicaciones y ofertas</H>
      <P>
        Al publicar, garantizas que tienes derecho a vender el bien o prestar el
        servicio, que la descripción e imágenes son fieles, y que el precio en
        soles (S/) es claro. Las ofertas de precio son propuestas no vinculantes
        hasta que el vendedor las acepte y las partes acuerden la entrega o
        prestación por los canales que elijan (p. ej. WhatsApp).
      </P>

      <H>4. Pagos</H>
      <P>
        En esta versión MVP, PulgasYa puede almacenar solo metadatos de tarjeta
        (marca, últimos 4 dígitos, vencimiento, titular) y no procesa cobros con
        el número completo ni el CVV. Los pagos entre usuarios pueden realizarse
        fuera de la plataforma hasta que se active una pasarela (Culqi, Niubiz o
        Mercado Pago) con las condiciones que se publiquen entonces.
      </P>

      <H>5. Conducta prohibida</H>
      <P>
        Queda prohibido publicar contenido ilegal, engañoso, discriminatorio,
        que infrinja derechos de terceros, o bienes restringidos (armas, drogas,
        documentos falsos, etc.). Podemos suspender o cerrar cuentas ante
        incumplimientos.
      </P>

      <H>6. Limitación de responsabilidad</H>
      <P>
        En la medida permitida por la ley peruana, PulgasYa no responde por
        daños derivados de tratos entre usuarios, calidad del producto/servicio,
        demoras o incumplimientos ajenos a la plataforma. El uso del servicio es
        bajo tu propio riesgo.
      </P>

      <H>7. Contacto</H>
      <P>
        Consultas sobre estos términos:{' '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda / soporte
        </Link>
        .
      </P>
    </LegalShell>
  );
}

function LegalShell({ title, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          {children}
        </div>
        <p className="mt-10 text-sm">
          <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
            Política de privacidad
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

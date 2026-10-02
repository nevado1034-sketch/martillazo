import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

export default function TermsPage() {
  return (
    <LegalShell title="Términos y condiciones">
      <p className="text-xs text-[var(--ink-faint)]">
        PulgasYa (también «Pulgas Ya») · Perú · Última actualización: septiembre
        2026. Este texto es orientativo para el producto; no sustituye asesoría
        legal formal. [Revisar con abogado antes de producción.]
      </p>

      <H>1. Aspectos generales y rol de la plataforma</H>
      <P>
        PulgasYa es un marketplace digital que facilita el encuentro entre
        personas que ofrecen productos (nuevos, de segunda mano o
        reacondicionados) y servicios, y personas interesadas en comprarlos o
        contratarlos en el territorio peruano.
      </P>
      <P>
        Actuamos como intermediarios tecnológicos: no somos propietarios ni
        fabricantes de los bienes publicados por terceros, ni prestamos el
        servicio anunciado, salvo que se indique expresamente lo contrario. El
        contrato de compraventa o de prestación se celebra entre usuarios.
      </P>
      <P>
        Al navegar, registrarte o realizar transacciones en PulgasYa aceptas
        estos términos. Debes ser mayor de edad según la legislación peruana.
      </P>

      <H>2. Cuenta y elegibilidad</H>
      <P>
        Debes proporcionar datos veraces (nombre, correo, WhatsApp u otros
        canales de contacto). Eres responsable de la confidencialidad de tu
        contraseña y de la actividad en tu cuenta. Podemos suspender o cerrar
        cuentas ante incumplimientos de estos términos o de la ley.
      </P>

      <H>3. Condición y naturaleza de los productos</H>
      <P>
        <strong>3.1 Segunda mano y reacondicionados.</strong> Se ofrecen «tal
        cual» (<em>as is</em>), con el desgaste natural propio de su uso. El
        comprador debe revisar con cuidado la descripción y las fotos antes de
        comprar.
      </P>
      <P>
        <strong>3.2 Nuevos.</strong> Cuando el vendedor indique que el producto
        es nuevo, se entiende sellado o en empaque original según la información
        publicada por el vendedor.
      </P>
      <P>
        <strong>3.3 Servicios.</strong> Las tarifas (por hora, desde o precio
        fijo) y el alcance del servicio deben describirse con claridad en el
        anuncio. La prestación concreta se coordina entre las partes.
      </P>

      <H>4. Publicaciones, ofertas y obligaciones del vendedor</H>
      <P>
        Al publicar, garantizas que tienes derecho a vender el bien o prestar el
        servicio; que la descripción e imágenes son fieles (incluye rayones,
        desgaste, reparaciones y fallas conocidas); y que el precio en soles
        (S/) es claro.
      </P>
      <P>
        Está prohibido ofrecer bienes robados, falsificados, peligrosos o
        restringidos, así como contenido ilegal, engañoso, discriminatorio o que
        infrinja derechos de terceros (armas, drogas, documentos falsos, etc.).
        PulgasYa puede retirar anuncios y suspender cuentas en esos casos.
      </P>
      <P>
        Las ofertas de precio son propuestas no vinculantes hasta que el
        vendedor las acepte y las partes acuerden la entrega o prestación por los
        canales que elijan (p. ej. WhatsApp), sin perjuicio de las reglas de
        custodia cuando la compra se haga dentro de la plataforma.
      </P>

      <H>5. Pagos y custodia (escrow) PulgasYa</H>
      <P>
        Cuando compras con custodia PulgasYa, el pago ingresa a la cuenta de
        custodia de la plataforma: <strong>no</strong> se libera al vendedor en
        el momento del cobro. La liberación al vendedor ocurre cuando el
        comprador confirma recepción/conformidad, o cuando transcurren{' '}
        <strong>24 horas</strong> desde que el pedido figura como entregado /
        recibido sin reclamo del comprador. El reloj de 24 h empieza en la
        entrega/recepción, no en el pago.
      </P>
      <P>
        PulgasYa cobra una comisión configurable (por defecto{' '}
        <strong>10%</strong> del monto de la orden) al liberar el pago; el
        vendedor recibe el neto. Si el comprador reclama dentro de las 24 h, la
        liberación se pausa hasta mediación.
      </P>
      <P>
        En esta versión MVP, el cobro puede operar en modo sandbox etiquetado.
        PulgasYa puede almacenar solo metadatos de tarjeta (marca, últimos 4
        dígitos, vencimiento, titular) y nunca el número completo ni el CVV.
        Cuando se active una pasarela (Culqi, Niubiz o Mercado Pago), aplicarán
        las condiciones que se publiquen entonces.
      </P>

      <H>6. Envíos, entregas y verificación (24 horas)</H>
      <P>
        Alineado con la custodia PulgasYa: el comprador dispone de{' '}
        <strong>24 horas</strong> desde la recepción / estado «entregado» para
        reportar anomalías sustanciales por los canales oficiales de la
        plataforma (reclamo en el pedido,{' '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda
        </Link>
        {' '}o correo a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reclamo%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        ). Transcurrido ese plazo sin reclamo, la transacción se considera
        completada a efectos de liberación del pago al vendedor (sin perjuicio de
        derechos irrenunciables que otorgue la ley).
      </P>
      <P>
        Daños de transporte: deben reportarse dentro de las mismas{' '}
        <strong>24 horas</strong>, idealmente con evidencia fotográfica o de
        video del desembalaje, a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reclamo%20transporte%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        .
      </P>

      <H>7. Cambios, devoluciones y reclamos</H>
      <P>
        <strong>Canal oficial de reclamos.</strong> Cualquier reclamo,
        disputa o queja de <strong>comprador o vendedor</strong> (producto no
        recibido, condición distinta a la anunciada, problemas de pago en
        custodia, mediación, etc.) debe dirigirse a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reclamo%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        . También puedes abrir un reclamo desde el pedido en la app o desde{' '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda
        </Link>
        .
      </P>
      <P>
        <strong>Procederán</strong>, en línea con la custodia y la mediación de
        la plataforma, cuando: el pedido no se recibe; el producto es
        sustancialmente distinto a lo anunciado; o existen fallas críticas no
        divulgadas en la publicación.
      </P>
      <P>
        <strong>No procederán</strong> (salvo mandato legal en contrario):
        expectativas estéticas subjetivas frente a un estado de uso ya
        divulgado; daños causados por el comprador tras la entrega; reclamos
        fuera de los plazos de la plataforma; o arrepentimiento sobre bienes de
        segunda mano descritos con exactitud.
      </P>

      <H>8. Exención de garantías y limitación de responsabilidad</H>
      <P>
        En bienes de segunda mano no hay garantía comercial o de fábrica salvo
        que el vendedor la indique expresamente. PulgasYa no otorga garantías
        implícitas sobre productos usados publicados por terceros.
      </P>
      <P>
        En la medida máxima permitida por la ley peruana, PulgasYa no responde
        por: la exactitud del contenido publicado por vendedores; el mal uso o
        fallas del producto ajenas a la plataforma; expectativas estéticas
        subjetivas frente a la descripción; ni por fallas preexistentes que
        hayan sido divulgadas en el anuncio. El uso del servicio es bajo tu
        propio riesgo. Tampoco respondemos por demoras o incumplimientos entre
        usuarios ajenos a la operación de la plataforma.
      </P>

      <H>9. Propiedad intelectual y modificaciones</H>
      <P>
        La marca PulgasYa / Pulgas Ya, el diseño de la interfaz y el código de
        la plataforma son propiedad de PulgasYa o de sus licenciantes. Puedes
        usar el servicio conforme a estos términos; no adquieres derechos sobre
        esos activos.
      </P>
      <P>
        Podemos modificar estos términos; la fecha de «última actualización»
        refleja la versión vigente. El uso continuado tras la publicación de
        cambios implica aceptación, en la medida que lo permita la ley.
      </P>

      <H>10. Jurisdicción y ley aplicable</H>
      <P>
        Estos términos se rigen por las leyes de la República del Perú. Salvo
        norma imperativa en contrario, quedan sometidos a los jueces y
        tribunales del domicilio de la sociedad operadora de PulgasYa en el
        Perú.
      </P>

      <H>11. Contacto</H>
      <P>
        Consultas sobre estos términos, reclamos de compradores o vendedores y
        atención general:{' '}
        <a
          href="mailto:soporte@pulgasya.com"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        {' · '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda
        </Link>
        . También puedes revisar nuestra{' '}
        <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
          Política de privacidad
        </Link>
        .
      </P>

      <p className="rounded-xl border border-[var(--line)] bg-[var(--mint-wash)] px-4 py-3 text-sm text-[var(--ink)]">
        Al usar PulgasYa confirmas que has leído y entendido estos términos.{' '}
        <Link to="/registro" className="font-semibold text-[var(--primary-celeste)] hover:underline">
          Crear cuenta
        </Link>
        {' · '}
        <Link to="/" className="font-semibold text-[var(--cta-orange)] hover:underline">
          Volver a PulgasYa
        </Link>
      </p>
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

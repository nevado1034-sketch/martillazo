import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

export default function TermsPage() {
  return (
    <LegalShell title="Términos y condiciones" updated="Octubre de 2026">
      <p className="rounded-xl border border-[var(--line)] bg-[var(--mint-wash)] px-4 py-3 text-sm text-[var(--ink)]">
        <strong>Titular:</strong> Lans Corp S.A.C. — RUC 20608151291 — con
        domicilio en Av. Arenales 2586, San Isidro, Lima, Perú. Opera la
        plataforma bajo la marca «PulgasYa» (también «Pulgas Ya»). Contacto:{' '}
        <a
          href="mailto:soporte@pulgasya.com"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        .
      </p>

      <H>1. Aceptación y capacidad</H>
      <P>
        Estos Términos y Condiciones (los «Términos») regulan el acceso y uso de
        la plataforma PulgasYa (el «Servicio»). Al registrarte, navegar o usar el
        Servicio aceptas estos Términos y nuestra{' '}
        <Link to="/privacidad" className="text-[var(--primary-celeste)] hover:underline">
          Política de Privacidad
        </Link>
        . Si no estás de acuerdo, no uses el Servicio.
      </P>
      <P>
        Debes ser mayor de 18 años y tener capacidad legal para contratar
        conforme al Código Civil peruano. El Servicio no está dirigido a menores
        de edad.
      </P>

      <H>2. Definiciones</H>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Plataforma / Servicio:</strong> el sitio web, aplicaciones y
          servicios tecnológicos operados por Lans Corp S.A.C. bajo la marca
          PulgasYa.
        </li>
        <li>
          <strong>Usuario:</strong> toda persona que accede o usa la Plataforma,
          ya sea como Comprador, Vendedor o ambos.
        </li>
        <li>
          <strong>Vendedor:</strong> Usuario que publica bienes o servicios.
        </li>
        <li>
          <strong>Comprador:</strong> Usuario que compra bienes o contrata
          servicios ofrecidos por un Vendedor.
        </li>
        <li>
          <strong>Pasarela de Pago:</strong> proveedor de servicios de pago
          autorizado (por ejemplo, Culqi, Niubiz o Mercado Pago) que procesa los
          cobros.
        </li>
        <li>
          <strong>Custodia PulgasYa:</strong> mecanismo tecnológico de pago en
          garantía, canalizado a través de una Pasarela de Pago, que retiene la
          liberación del monto al Vendedor hasta la conformidad del Comprador.
        </li>
      </ul>

      <H>3. Naturaleza del servicio: PulgasYa es un intermediario tecnológico</H>
      <P>
        <strong>3.1.</strong> PulgasYa pone a disposición una infraestructura
        digital para que los Usuarios publiquen, busquen, oferten y contacten
        entre sí. PulgasYa <strong>no</strong> es vendedor, fabricante,
        importador, distribuidor, proveedor, comisionista ni propietario de los
        bienes o servicios publicados por los Usuarios, y no presta el servicio
        anunciado.
      </P>
      <P>
        <strong>3.2.</strong> El contrato de compraventa, arrendamiento o de
        prestación de servicios se celebra <strong>exclusivamente entre el
        Comprador y el Vendedor</strong>. PulgasYa no es parte de ese contrato ni
        interviene en su ejecución.
      </P>
      <P>
        <strong>3.3.</strong> PulgasYa no verifica ni garantiza la identidad,
        solvencia, veracidad, legitimidad, calidad, seguridad, estado ni
        legalidad de los bienes o servicios publicados, ni el cumplimiento de los
        Usuarios. No inspecciona ni almacena los bienes objeto de las
        transacciones.
      </P>
      <P>
        <strong>3.4.</strong> La negociación, el pago, la entrega, las garantías,
        los riesgos y los reclamos entre Usuarios son de exclusiva
        responsabilidad de estos. En la máxima medida permitida por la ley,
        PulgasYa no responde por el incumplimiento, la mora, la insolvencia, el
        fraude o cualquier conducta de los Usuarios.
      </P>
      <P>
        <strong>3.5.</strong> Lo anterior se entiende sin perjuicio de las
        obligaciones que la ley peruana imponga a PulgasYa respecto de su propio
        servicio de intermediación, así como de los derechos irrenunciables que
        el Código de Protección y Defensa del Consumidor (Ley N.º 29571) reconoce
        a los consumidores.
      </P>

      <H>4. Cuenta, veracidad de datos y seguridad</H>
      <P>
        Debes proporcionar información veraz, exacta y actualizada (nombre,
        correo, teléfono/WhatsApp u otros canales). Eres el único responsable de
        la confidencialidad de tu contraseña y de toda actividad realizada en tu
        cuenta, y debes notificarnos de inmediato cualquier uso no autorizado.
        Podemos suspender o cerrar cuentas ante incumplimientos de estos Términos
        o de la ley, o ante riesgo de fraude.
      </P>

      <H>5. Publicaciones: obligaciones y contenido prohibido</H>
      <P>
        Al publicar, el Vendedor declara y garantiza que tiene derecho a vender
        el bien o a prestar el servicio; que la descripción, fotos y precio en
        soles (S/) son fieles y completos; y que informará todo defecto, falla,
        reparación o desgaste conocido.
      </P>
      <P>
        Está prohibido publicar u ofrecer bienes o servicios robados,
        falsificados, adulterados, peligrosos, vencidos o restringidos por ley,
        así como contenido ilegal, fraudulento, engañoso, discriminatorio o que
        infrinja derechos de terceros (por ejemplo, armas, drogas, documentos
        falsos, especies protegidas, datos personales de terceros sin
        consentimiento, entre otros).
      </P>
      <P>
        PulgasYa puede, a su sola discreción, retirar o eliminar publicaciones y
        suspender cuentas ante indicios de ilegalidad o incumplimiento, sin que
        ello implique una obligación general de monitoreo ni la asunción de
        responsabilidad sobre el contenido de los Usuarios. PulgasYa colabora con
        las autoridades competentes cuando la ley lo exige.
      </P>

      <H>6. Precios, pagos y comisión</H>
      <P>
        Los precios se expresan en soles (S/). PulgasYa cobra una comisión
        configurable (por defecto <strong>10%</strong> del monto de la orden) al
        liberar el pago; el Vendedor recibe el neto correspondiente.
      </P>
      <P>
        Los pagos se procesan a través de una <strong>Pasarela de Pago
        autorizada</strong>. Los datos de tarjeta son procesados por la Pasarela;
        PulgasYa puede almacenar únicamente metadatos (marca, últimos 4 dígitos,
        vencimiento y titular) y <strong>nunca</strong> el número completo de la
        tarjeta ni el código CVV. Los comprobantes de pago se emiten conforme a
        las normas de la SUNAT.
      </P>

      <H>7. Custodia PulgasYa (pago en garantía)</H>
      <P>
        Cuando el Comprador use la Custodia PulgasYa, el monto se procesa a
        través de la Pasarela de Pago y <strong>no</strong> se libera al Vendedor
        de inmediato. La liberación ocurre cuando el Comprador confirma la
        recepción/conformidad, o cuando transcurren{' '}
        <strong>24 horas</strong> desde que el pedido figura como entregado o
        recibido sin reclamo del Comprador.
      </P>
      <P>
        Si el Comprador presenta un reclamo dentro de ese plazo, la liberación se
        pausa hasta la mediación de PulgasYa. La Custodia PulgasYa es un servicio
        tecnológico canalizado por la Pasarela de Pago y no constituye captación
        de fondos del público ni un servicio financiero propio de PulgasYa.
      </P>

      <H>8. Entregas, plazos y verificación (24 horas)</H>
      <P>
        El Comprador dispone de <strong>24 horas</strong> desde la recepción o
        desde el estado «entregado» para reportar anomalías sustanciales por los
        canales oficiales (reclamo en el pedido,{' '}
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
        ). Transcurrido ese plazo sin reclamo, la transacción se considerará
        completada a efectos de la liberación del pago, sin perjuicio de los
        derechos irrenunciables que otorgue la ley.
      </P>
      <P>
        Los daños ocasionados en el transporte deben reportarse dentro de las
        mismas <strong>24 horas</strong>, idealmente con evidencia fotográfica o
        de video del desembalaje, a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reclamo%20transporte%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        .
      </P>

      <H>9. Reclamos, mediación y Libro de Reclamaciones</H>
      <P>
        Todo reclamo, disputa o queja de Comprador o Vendedor debe dirigirse a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reclamo%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        {' '}o abrirse desde el pedido en la app o desde{' '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda
        </Link>
        . PulgasYa pone a disposición el <strong>Libro de Reclamaciones</strong>{' '}
        conforme al Decreto Supremo N.º 011-2011-PCM y sus modificatorias.
      </P>
      <P>
        <strong>Procederán</strong>, en línea con la custodia y la mediación de
        la Plataforma, cuando: el pedido no se recibe; el producto es
        sustancialmente distinto a lo anunciado; o existen fallas críticas no
        divulgadas en la publicación.
      </P>
      <P>
        <strong>No procederán</strong> (salvo mandato legal en contrario):
        expectativas estéticas subjetivas frente a un estado de uso ya divulgado;
        daños causados por el Comprador tras la entrega; reclamos fuera de los
        plazos de la Plataforma; o arrepentimiento sobre bienes de segunda mano
        descritos con exactitud.
      </P>

      <H>10. Prohibición de fraude y conductas ilícitas</H>
      <P>
        Los Usuarios se obligan a no realizar actos de fraude, estafa,
        suplantación de identidad, uso de datos o medios de pago ajenos,
        lavado de activos o cualquier conducta ilícita, y a no usar el Servicio
        para infringir la ley. PulgasYa no responde por los actos ilícitos de los
        Usuarios.
      </P>
      <P>
        PulgasYa coopera con la Policía Nacional del Perú, el Ministerio Público
        y demás autoridades competentes, y podrá reportar y denunciar hechos que
        revistan indicios de delito (por ejemplo, conforme a los artículos
        pertinentes del Código Penal y la Ley N.º 30096 de Delitos Informáticos).
        Los Usuarios deben reportar conductas sospechosas a{' '}
        <a
          href="mailto:soporte@pulgasya.com?subject=Reporte%20fraude%20PulgasYa"
          className="text-[var(--primary-celeste)] hover:underline"
        >
          soporte@pulgasya.com
        </a>
        .
      </P>

      <H>11. Suspensión y terminación</H>
      <P>
        PulgasYa puede suspender, restringir o cancelar el acceso de un Usuario,
        así como retirar contenido, ante incumplimientos de estos Términos, de la
        ley, o ante riesgo de fraude o de daño a otros Usuarios o a la
        Plataforma. El Usuario puede solicitar el cierre de su cuenta en
        cualquier momento.
      </P>

      <H>12. Exención de garantías y limitación de responsabilidad</H>
      <P>
        El Servicio se presta «tal cual» y «según disponibilidad». En bienes de
        segunda mano no existe garantía comercial o de fábrica salvo que el
        Vendedor la indique expresamente.
      </P>
      <P>
        En la máxima medida permitida por la ley peruana, PulgasYa no responde
        por: la exactitud o legalidad del contenido publicado por los Usuarios;
        los actos, omisiones o incumplimientos de los Usuarios; el mal uso del
        producto o fallas ajenas a la Plataforma; expectativas estéticas
        subjetivas; ni por daños indirectos, lucro cesante o daño consecuencial.
        El uso del Servicio es bajo tu propio riesgo.
      </P>
      <P>
        Cuando la ley no permita excluir la responsabilidad, esta se limitará,
        en la medida máxima permitida, al monto de la comisión efectivamente
        percibida por PulgasYa en la transacción involucrada. Nada en estos
        Términos limita los derechos irrenunciables del consumidor conforme a la
        Ley N.º 29571, ni la responsabilidad que no pueda eximirse por ley
        (v.gr. dolo o culpa inexcusable, conforme al artículo 1398 del Código
        Civil).
      </P>

      <H>13. Indemnidad</H>
      <P>
        El Usuario mantendrá indemne a Lans Corp S.A.C. y a PulgasYa, así como a
        sus directores, representantes y colaboradores, frente a cualquier
        reclamo, sanción, daño o gasto (incluidos honorarios razonables) derivado
        de: su uso del Servicio, el contenido que publique, el incumplimiento de
        estos Términos o de la ley, o la vulneración de derechos de terceros.
      </P>

      <H>14. Propiedad intelectual</H>
      <P>
        La marca PulgasYa / Pulgas Ya, el diseño de la interfaz, los textos y el
        código de la Plataforma son propiedad de Lans Corp S.A.C. o de sus
        licenciantes. Se te concede una licencia limitada, revocable y no
        exclusiva para usar el Servicio conforme a estos Términos; no adquieres
        derecho alguno sobre dichos activos. Respecto del contenido que publiques
        (fotos, textos), otorgas a PulgasYa una licencia para mostrarlo y
        difundirlo con la finalidad de operar el Servicio.
      </P>

      <H>15. Modificaciones y notificaciones</H>
      <P>
        Podemos modificar estos Términos por cambios legales, técnicos o del
        Servicio. Publicaremos la versión vigente con su fecha de actualización.
        El uso continuado tras la publicación implica aceptación, en la medida
        que lo permita la ley. Las notificaciones podrán realizarse por correo
        electrónico, en la app o en el Sitio.
      </P>

      <H>16. Ley aplicable y jurisdicción</H>
      <P>
        Estos Términos se rigen por las leyes de la República del Perú. Salvo
        norma imperativa en contrario, las controversias se someten a los jueces
        y tribunales del domicilio del titular (Av. Arenales 2586, San Isidro,
        Lima, Perú). Sin perjuicio de
        ello, los consumidores conservan el derecho de acudir a los órganos
        competentes, incluido el Instituto Nacional de Defensa de la Competencia
        y de la Protección de la Propiedad Intelectual (INDECOPI), y de usar
        mecanismos de conciliación extrajudicial conforme a la Ley N.º 26872.
      </P>

      <H>17. Contacto</H>
      <P>
        Consultas sobre estos Términos, reclamos de Compradores o Vendedores y
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
          Política de Privacidad
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
          Volver al inicio
        </Link>
      </p>
    </LegalShell>
  );
}

function LegalShell({ title, updated, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="font-display text-3xl font-bold">{title}</h1>
        {updated ? (
          <p className="mt-2 text-xs text-[var(--ink-faint)]">
            Última actualización: {updated}
          </p>
        ) : null}
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

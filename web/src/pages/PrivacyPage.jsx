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
          Última actualización: octubre de 2026 · Aplicable a la Ley N.º 29733,
          Ley de Protección de Datos Personales, y su Reglamento aprobado por
          Decreto Supremo N.º 016-2024-JUS.
        </p>

        <div className="mt-6 space-y-4 text-sm leading-relaxed text-[var(--ink)]">
          <H>1. Responsable del tratamiento</H>
          <P>
            El responsable del tratamiento de tus datos personales es{' '}
            <strong>Lans Corp S.A.C.</strong>, con RUC 20608151291 y domicilio
            en Av. Arenales 2586, San Isidro, Lima, Perú, que opera la
            plataforma PulgasYa. Contacto del
            responsable y del Oficial de Protección de Datos (DPD):{' '}
            <a
              href="mailto:privacidad@pulgasya.com"
              className="text-[var(--primary-celeste)] hover:underline"
            >
              privacidad@pulgasya.com
            </a>
            {' · '}
            <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
              Ayuda
            </Link>
            .
          </P>

          <H>2. Marco legal aplicable</H>
          <P>
            Tratamos tus datos conforme a la Ley N.º 29733, su Reglamento (D.S.
            N.º 016-2024-JUS), las directivas de la Autoridad Nacional de
            Protección de Datos Personales (ANPDP) del Ministerio de Justicia y
            Derechos Humanos, y demás normativa aplicable. Aplicamos los
            principios de legalidad, consentimiento, finalidad, proporcionalidad,
            calidad, seguridad y disposición de recurso, entre otros.
          </P>

          <H>3. Datos personales que tratamos</H>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Identificación:</strong> nombre, correo electrónico,
              teléfono/WhatsApp, distrito o dirección.
            </li>
            <li>
              <strong>Cuenta:</strong> credenciales (contraseña almacenada como
              hash), foto de perfil y preferencias.
            </li>
            <li>
              <strong>Identidad (opcional):</strong> tipo y número de documento e
              imágenes de verificación (KYC), en estado pendiente o verificado.
            </li>
            <li>
              <strong>Pagos:</strong> marca, últimos 4 dígitos, vencimiento y
              titular —<strong> nunca</strong> el número completo de la tarjeta
              ni el CVV. El procesamiento lo realiza una pasarela de pago
              autorizada.
            </li>
            <li>
              <strong>Actividad:</strong> publicaciones, ofertas, pedidos,
              mensajes y registros técnicos de seguridad (dirección IP, fecha y
              hora, identificadores de dispositivo).
            </li>
            <li>
              <strong>Ubicación:</strong> referencia de distrito o zona que
              indiques en tus anuncios, no geolocalización precisa.
            </li>
          </ul>

          <H>4. Datos sensibles y menores de edad</H>
          <P>
            Solo trataremos datos sensibles (por ejemplo, la imagen de tu
            documento de identidad para KYC) cuando los proporciones
            voluntariamente para verificar tu identidad, con tu consentimiento
            expreso y para esa finalidad. El Servicio no está dirigido a menores
            de edad y no recopilamos conscientemente sus datos.
          </P>

          <H>5. Finalidades y bases de licitud</H>
          <P>
            Tratamos tus datos para: crear y administrar tu cuenta y darte el
            Servicio (ejecución de la relación contractual); mostrar y gestionar
            anuncios, ofertas y pedidos; permitir el contacto entre Usuarios
            según tu preferencia de visibilidad del teléfono; procesar pagos y la
            custodia a través de la pasarela; verificar tu identidad cuando lo
            solicites; atender reclamos y requerimientos; prevenir y detectar
            fraude; enviar notificaciones si las activas; y cumplir obligaciones
            legales. Las bases de licitud son: tu <strong>consentimiento</strong>,
            la <strong>ejecución de la relación contractual</strong>, el{' '}
            <strong>cumplimiento de obligaciones legales</strong> y el{' '}
            <strong>interés legítimo</strong> en la seguridad y prevención de
            fraude.
          </P>

          <H>6. Conservación</H>
          <P>
            Conservamos tus datos mientras tu cuenta esté activa y, luego de su
            cierre, durante los plazos necesarios para cumplir obligaciones
            legales, resolver disputas y prevenir fraude. Al cerrar la cuenta
            aplicamos un proceso de desactivación y anonimización razonable de
            datos personales, conservando la información mínima necesaria.
          </P>

          <H>7. Destinatarios, encargados y transferencias</H>
          <P>
            No vendemos tus datos personales con fines publicitarios. Podemos
            comunicar tus datos a: la pasarela de pago autorizada que procesa los
            cobros; proveedores de infraestructura tecnológica (alojamiento web,
            base de datos, almacenamiento de imágenes y servicios de
            autenticación como Google/Firebase) que actúan como encargados de
            tratamiento; y autoridades competentes cuando la ley lo exija. Estos
            proveedores pueden estar ubicados en el extranjero, por lo que pueden
            producirse <strong>transferencias internacionales</strong> de datos;
            en tal caso exigimos garantías contractuales y técnicas adecuadas y,
            cuando corresponda, recabamos tu consentimiento conforme al
            Reglamento.
          </P>

          <H>8. Cookies y almacenamiento local</H>
          <P>
            Usamos almacenamiento local y cookies esenciales para mantener tu
            sesión y preferencias. No usamos cookies de publicidad de terceros.
            Puedes consultar el detalle en nuestra{' '}
            <Link to="/cookies" className="text-[var(--primary-celeste)] hover:underline">
              política de cookies
            </Link>
            . La mayoría de navegadores permite bloquear o eliminar cookies; ello
            puede afectar el funcionamiento del Servicio.
          </P>

          <H>9. Seguridad de la información</H>
          <P>
            Aplicamos medidas técnicas y organizativas razonables para proteger
            tus datos: cifrado en tránsito (HTTPS), control de acceso,
            almacenamiento seguro de credenciales (hash) y copias de seguridad.
          </P>

          <H>10. Tus derechos (ARCO)</H>
          <P>
            Puedes ejercer tus derechos de <strong>Acceso, Rectificación,
            Cancelación y Oposición</strong>, así como los demás derechos
            reconocidos por ley, escribiendo a{' '}
            <a
              href="mailto:privacidad@pulgasya.com"
              className="text-[var(--primary-celeste)] hover:underline"
            >
              privacidad@pulgasya.com
            </a>
            , sujeto a verificación de identidad. Las solicitudes son
            gratuitas y se atienden dentro de los plazos previstos en el
            Reglamento. También puedes gestionar ciertos datos directamente desde
            la sección de Configuración de tu cuenta.
          </P>

          <H>11. Reclamación ante la autoridad</H>
          <P>
            Si consideras que no hemos atendido adecuadamente tus derechos,
            puedes presentar una reclamación ante la Autoridad Nacional de
            Protección de Datos Personales (ANPDP) del Ministerio de Justicia y
            Derechos Humanos.
          </P>

          <H>12. Notificación de incidentes</H>
          <P>
            Si se produce una vulneración de seguridad que afecte tus datos
            personales, la notificaremos a la autoridad y a los titulares
            afectados en los plazos y condiciones que establece el Reglamento.
          </P>

          <H>13. Cambios a esta política</H>
          <P>
            Podemos actualizar esta Política por cambios legales o del Servicio.
            Publicaremos la versión vigente con su fecha de actualización.
          </P>

          <H>14. Contacto</H>
          <P>
            Para cualquier consulta sobre privacidad o el ejercicio de tus
            derechos, escríbenos a{' '}
            <a
              href="mailto:privacidad@pulgasya.com"
              className="text-[var(--primary-celeste)] hover:underline"
            >
              privacidad@pulgasya.com
            </a>
            . Consulta también nuestros{' '}
            <Link to="/terminos" className="text-[var(--primary-celeste)] hover:underline">
              Términos y condiciones
            </Link>
            .
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

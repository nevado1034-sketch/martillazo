import { env } from '../config/env.js';

/**
 * Envío de correo MVP.
 * - Sin SMTP: log en consola (desarrollo) y opcionalmente retorna el cuerpo.
 * - Con SMTP_HOST: intenta enviar vía fetch a un relay simple o documenta
 *   que en prod se debe usar nodemailer/SES (ver pulgasya-mvp-notes.md).
 *
 * No cobra ni simula pagos. Solo notificaciones (reset de contraseña, etc.).
 */
export async function sendMail({ to, subject, text, html }) {
  const payload = {
    to,
    subject,
    text,
    html: html || text,
    at: new Date().toISOString(),
  };

  if (!env.smtpHost) {
    console.log('[mail:dev] SMTP no configurado — mensaje en consola:');
    console.log(JSON.stringify(payload, null, 2));
    return {
      delivered: false,
      mode: 'console',
      message: 'Correo registrado en consola del servidor (dev).',
    };
  }

  // Stub de integración SMTP: log + marca “queued”. En producción conectar
  // nodemailer / Amazon SES / Resend con SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
  console.log('[mail:smtp-stub] Encolar envío (implementar transporte real):', {
    host: env.smtpHost,
    port: env.smtpPort,
    to,
    subject,
  });
  console.log(text);
  return {
    delivered: false,
    mode: 'smtp-stub',
    message:
      'SMTP configurado pero el transporte real aún no está cableado. Ver docs de ops.',
  };
}

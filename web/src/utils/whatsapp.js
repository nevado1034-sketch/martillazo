/** Construye enlace wa.me con mensaje prefijado. */
export function buildWhatsAppLink({ phone, text }) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) return null;
  const msg = encodeURIComponent(text || '');
  return `https://wa.me/${digits}?text=${msg}`;
}

export function offerWhatsAppText({ listingTitle, amount, buyerName }) {
  const who = buyerName ? `Soy ${buyerName}. ` : '';
  return `${who}Hola, vi tu anuncio «${listingTitle}» en PulgasYa y te propongo S/ ${amount}. ¿Seguimos por aquí?`;
}

export function contactWhatsAppText({ listingTitle, buyerName }) {
  const who = buyerName ? `Soy ${buyerName}. ` : '';
  return `${who}Hola, me interesa tu anuncio «${listingTitle}» en PulgasYa.`;
}

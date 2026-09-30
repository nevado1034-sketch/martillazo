/** Primer nombre en MAYÚSCULAS para el saludo del header. */
export function greetingFirstName(user) {
  const raw =
    user?.displayName ||
    user?.fullName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'tú';
  const first = String(raw).trim().split(/\s+/)[0] || 'tú';
  return first.toLocaleUpperCase('es-PE');
}

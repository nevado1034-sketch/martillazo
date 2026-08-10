/**
 * URL base de la API y de los WebSockets.
 *
 * Si no se define VITE_API_URL/VITE_SOCKET_URL, se deriva del host desde el
 * que se abre la app: en el celular (p. ej. http://192.168.1.20:5173) apuntará
 * automáticamente a http://192.168.1.20:4000, sin necesidad de recompilar.
 */
const configuredApi = (import.meta.env.VITE_API_URL ?? '').trim();
const configuredSocket = (import.meta.env.VITE_SOCKET_URL ?? '').trim();

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const API_URL =
  configuredApi || `${window.location.protocol}//${host}:4000`;

export const SOCKET_URL = configuredSocket || `${window.location.protocol}//${host}:4000`;

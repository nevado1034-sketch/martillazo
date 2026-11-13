import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES = {
  '/': 'PulgasYa — Segunda mano y servicios',
  '/buscar': 'Explorar anuncios — PulgasYa',
  '/publicar': 'Publicar anuncio — PulgasYa',
  '/mis-ofertas': 'Mis ofertas — PulgasYa',
  '/mis-anuncios': 'Mis anuncios — PulgasYa',
  '/mis-ventas': 'Mis ventas — PulgasYa',
  '/mis-pedidos': 'Mis pedidos — PulgasYa',
  '/configuracion': 'Configuración — PulgasYa',
  '/ayuda': 'Ayuda y contacto — PulgasYa',
  '/terminos': 'Términos — PulgasYa',
  '/privacidad': 'Privacidad — PulgasYa',
  '/cookies': 'Cookies — PulgasYa',
  '/recuperar': 'Recuperar contraseña — PulgasYa',
  '/restablecer': 'Restablecer contraseña — PulgasYa',
  '/entrar': 'Entrar — PulgasYa',
  '/login': 'Entrar — PulgasYa',
  '/registro': 'Crear cuenta — PulgasYa',
};

/**
 * Actualiza el título de la pestaña según la ruta.
 * Las páginas con datos propios (p. ej. la ficha) pueden sobrescribirlo
 * después de cargar.
 */
export default function DocumentTitle() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    let title = TITLES[pathname];

    if (!title && pathname.startsWith('/anuncio/')) {
      title = 'Anuncio — PulgasYa';
    }
    if (!title && pathname.startsWith('/pedido/')) {
      title = 'Pedido — PulgasYa';
    }
    if (pathname === '/buscar') {
      const q = new URLSearchParams(search).get('q');
      if (q) title = `${q} — PulgasYa`;
    }

    document.title = title || 'Página no encontrada — PulgasYa';
  }, [pathname, search]);

  return null;
}

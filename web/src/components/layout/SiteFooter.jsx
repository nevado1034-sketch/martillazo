import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-white/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold text-[var(--primary-celeste)]">PulgasYa</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--ink-muted)]">
            Segunda mano y servicios cerca de ti. Compra, vende y contrata con confianza.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--ink-muted)]">
          <Link to="/buscar?tipo=producto" className="hover:text-[var(--ink)]">
            Productos
          </Link>
          <Link to="/buscar?tipo=servicio" className="hover:text-[var(--ink)]">
            Servicios
          </Link>
          <Link to="/publicar" className="hover:text-[var(--ink)]">
            Publicar
          </Link>
          <Link to="/ayuda" className="hover:text-[var(--ink)]">
            Ayuda
          </Link>
          <Link to="/terminos" className="hover:text-[var(--ink)]">
            Términos
          </Link>
          <Link to="/privacidad" className="hover:text-[var(--ink)]">
            Privacidad
          </Link>
        </div>
      </div>
    </footer>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { greetingFirstName } from '../../utils/userDisplay.js';

export default function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const name = greetingFirstName(user);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--primary-celeste)] transition hover:border-[var(--primary-celeste)] hover:bg-[var(--mint-wash)]"
      >
        <span>Hola {name}</span>
        <svg
          className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-[60] mt-2 w-[min(16rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[var(--line)] bg-white py-1 shadow-lg animate-fade-in"
        >
          <p className="truncate border-b border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-faint)]">
            {user.email}
          </p>
          <MenuItem onClick={() => go('/mis-anuncios')}>Mis anuncios</MenuItem>
          <MenuItem onClick={() => go('/mis-ofertas')}>Mis ofertas</MenuItem>
          <MenuItem onClick={() => go('/publicar')}>Publicar</MenuItem>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2.5 text-left text-sm font-medium text-[var(--ink-muted)] hover:bg-[var(--coral-wash)] hover:text-[var(--cta-orange)]"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            Salir
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full px-3 py-2.5 text-left text-sm font-medium text-[var(--text-dark)] hover:bg-[var(--mint-wash)] hover:text-[var(--primary-celeste)]"
    >
      {children}
    </button>
  );
}

/** Variante para el menú móvil (lista, sin dropdown flotante). */
export function AccountMenuMobile({ user, onLogout, onNavigate }) {
  const name = greetingFirstName(user);
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--mint-wash)] p-3">
      <p className="font-semibold text-[var(--primary-celeste)]">Hola {name}</p>
      <p className="mt-0.5 truncate text-xs text-[var(--ink-faint)]">{user.email}</p>
      <div className="mt-3 flex flex-col gap-1">
        <Link
          to="/mis-anuncios"
          className="rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-dark)] hover:bg-white"
          onClick={onNavigate}
        >
          Mis anuncios
        </Link>
        <Link
          to="/mis-ofertas"
          className="rounded-lg px-2 py-2 text-sm font-medium text-[var(--text-dark)] hover:bg-white"
          onClick={onNavigate}
        >
          Mis ofertas
        </Link>
        <Link
          to="/publicar"
          className="rounded-lg px-2 py-2 text-sm font-medium text-[var(--cta-orange)] hover:bg-white"
          onClick={onNavigate}
        >
          Publicar
        </Link>
        <button
          type="button"
          className="rounded-lg px-2 py-2 text-left text-sm font-medium text-[var(--ink-muted)] hover:bg-white"
          onClick={() => {
            onLogout();
            onNavigate?.();
          }}
        >
          Salir
        </button>
      </div>
    </div>
  );
}

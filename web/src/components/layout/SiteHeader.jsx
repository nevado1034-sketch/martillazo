import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../store/AuthContext.jsx';
import AccountMenu, { AccountMenuMobile } from './AccountMenu.jsx';
import { greetingFirstName } from '../../utils/userDisplay.js';

export default function SiteHeader({ searchValue = '', onSearchSubmit }) {
  const navigate = useNavigate();
  const { user, logout, setAuthOpen } = useAuth();
  const [q, setQ] = useState(searchValue);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountPanelRef = useRef(null);

  const submit = (e) => {
    e.preventDefault();
    const query = q.trim();
    if (onSearchSubmit) {
      onSearchSubmit(query);
      return;
    }
    navigate(query ? `/buscar?q=${encodeURIComponent(query)}` : '/buscar');
    setMenuOpen(false);
    setAccountOpen(false);
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition ${
      isActive ? 'text-[var(--brand)]' : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
    }`;

  useEffect(() => {
    if (!accountOpen) return undefined;
    const onDoc = (e) => {
      if (!accountPanelRef.current?.contains(e.target)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [accountOpen]);

  const hello = user ? greetingFirstName(user) : '';

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        <Link
          to="/"
          className="shrink-0 font-display text-lg font-bold tracking-tight text-[var(--primary-celeste)] sm:text-2xl"
        >
          PulgasYa
        </Link>

        <form onSubmit={submit} className="hidden min-w-0 flex-1 md:block">
          <label className="sr-only" htmlFor="header-search">
            Buscar
          </label>
          <div className="flex overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--mint-soft)]">
            <input
              id="header-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar productos o servicios"
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-[var(--ink-faint)]"
            />
            <button
              type="submit"
              className="bg-[var(--primary-celeste)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            >
              Buscar
            </button>
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-4 lg:flex">
          <NavLink to="/buscar?tipo=producto" className={linkClass}>
            Productos
          </NavLink>
          <NavLink to="/buscar?tipo=servicio" className={linkClass}>
            Servicios
          </NavLink>
          {user ? (
            <AccountMenu user={user} onLogout={logout} />
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              Entrar
            </button>
          )}
          <NavLink
            to="/publicar"
            className="rounded-xl bg-[var(--cta-orange)] px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-95 hover:scale-[1.02] active:scale-[0.98]"
          >
            Publicar
          </NavLink>
        </nav>

        {/* Mobile: Hola NOMBRE + Menú */}
        <div className="ml-auto flex items-center gap-2 lg:hidden">
          {user ? (
            <button
              type="button"
              aria-expanded={accountOpen}
              onClick={() => {
                setAccountOpen((v) => !v);
                setMenuOpen(false);
              }}
              className="max-w-[9.5rem] truncate rounded-xl border border-[var(--primary-celeste)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--primary-celeste)] sm:max-w-none sm:text-sm"
            >
              Hola {hello}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded-xl px-2 py-2 text-xs font-semibold text-[var(--primary-celeste)] sm:text-sm"
            >
              Entrar
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-medium text-[var(--ink)]"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v);
              setAccountOpen(false);
            }}
          >
            Menú
          </button>
        </div>
      </div>

      {/* Panel cuenta móvil — full width, no clipped */}
      {accountOpen && user && (
        <div
          ref={accountPanelRef}
          className="border-t border-[var(--line)] bg-white px-3 py-3 lg:hidden animate-fade-in"
        >
          <AccountMenuMobile
            user={user}
            onLogout={logout}
            onNavigate={() => setAccountOpen(false)}
          />
        </div>
      )}

      {menuOpen && (
        <div className="border-t border-[var(--line)] bg-white px-4 py-3 lg:hidden animate-fade-in">
          <form onSubmit={submit} className="mb-3 md:hidden">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </form>
          <div className="flex flex-col gap-2">
            <NavLink to="/buscar?tipo=producto" className={linkClass} onClick={() => setMenuOpen(false)}>
              Productos
            </NavLink>
            <NavLink to="/buscar?tipo=servicio" className={linkClass} onClick={() => setMenuOpen(false)}>
              Servicios
            </NavLink>
            <NavLink
              to="/publicar"
              className="rounded-xl bg-[var(--cta-orange)] px-3.5 py-2.5 text-center text-sm font-semibold text-white"
              onClick={() => setMenuOpen(false)}
            >
              Publicar
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PRODUCT_CATEGORIES } from '../../data/taxonomy.js';

function activeCategoryFromLocation(location) {
  if (location.pathname !== '/buscar' && location.pathname !== '/') return null;
  const params = new URLSearchParams(location.search);
  if (location.pathname === '/' && params.get('productos') !== '1') return null;
  return params.get('cat');
}

export function CategoryMenu() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const location = useLocation();
  const activeCat = activeCategoryFromLocation(location);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={`flex items-center gap-1 text-sm font-medium transition ${
          activeCat
            ? 'text-[var(--brand)]'
            : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
        }`}
      >
        Categorías
        <span aria-hidden="true" className="text-[10px] opacity-70">
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 max-h-[72vh] w-[min(92vw,780px)] overflow-y-auto rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_24px_60px_-24px_rgba(31,41,55,0.35)] animate-fade-in">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_CATEGORIES.map((category) => (
              <div key={category.id} className="min-w-0">
                <Link
                  to={`/?productos=1&cat=${category.id}`}
                  className="block text-sm font-bold text-[var(--ink)] underline decoration-[var(--brand)] decoration-2 underline-offset-4 transition hover:text-[var(--brand)]"
                >
                  {category.label}
                </Link>
                <ul className="mt-1.5 space-y-1">
                  {category.subcategories.map((subcategory) => (
                    <li key={subcategory.id}>
                      <Link
                        to={`/?productos=1&cat=${category.id}&sub=${subcategory.id}`}
                        className="block truncate text-xs text-[var(--ink-muted)] transition hover:text-[var(--brand)]"
                      >
                        {subcategory.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
            <Link
              to="/?productos=1"
              className="text-sm font-semibold text-[var(--brand)] hover:underline"
            >
              Ver todos los productos →
            </Link>
            <Link
              to="/buscar?tipo=servicio"
              className="text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--brand)]"
            >
              Ver servicios
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function MobileCategoryList({ onNavigate }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
      {PRODUCT_CATEGORIES.map((category) => (
        <details
          key={category.id}
          className="group border-b border-[var(--line)] last:border-b-0"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold text-[var(--ink)] [&::-webkit-details-marker]:hidden">
            <span>{category.label}</span>
            <span
              aria-hidden="true"
              className="text-[10px] text-[var(--ink-faint)] transition group-open:rotate-180"
            >
              ▾
            </span>
          </summary>
          <div className="px-3 pb-3">
            <Link
              to={`/?productos=1&cat=${category.id}`}
              onClick={onNavigate}
              className="mb-2 block text-xs font-semibold text-[var(--brand)]"
            >
              Ver todo {category.label}
            </Link>
            {category.subcategories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {category.subcategories.map((subcategory) => (
                  <Link
                    key={subcategory.id}
                    to={`/?productos=1&cat=${category.id}&sub=${subcategory.id}`}
                    onClick={onNavigate}
                    className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]"
                  >
                    {subcategory.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

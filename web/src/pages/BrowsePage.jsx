import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import TypeToggle from '../components/listings/TypeToggle.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
} from '../data/mockListings.js';

export default function BrowsePage() {
  const { listings } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const q = params.get('q') || '';
  const tipo = params.get('tipo') || 'todos';
  const cat = params.get('cat') || '';

  const categories =
    tipo === 'servicio' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return listings.filter((l) => {
      if (tipo === 'producto' && l.type !== 'producto') return false;
      if (tipo === 'servicio' && l.type !== 'servicio') return false;
      if (cat && l.category !== cat) return false;
      if (!needle) return true;
      const hay = `${l.title} ${l.description} ${l.location} ${l.seller?.name}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [listings, q, tipo, cat]);

  const setTipo = (next) => {
    const p = new URLSearchParams(params);
    if (next === 'todos') p.delete('tipo');
    else p.set('tipo', next);
    p.delete('cat');
    setParams(p);
  };

  const setCat = (id) => {
    const p = new URLSearchParams(params);
    if (!id || id === cat) p.delete('cat');
    else p.set('cat', id);
    setParams(p);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        searchValue={q}
        onSearchSubmit={(query) => {
          const p = new URLSearchParams(params);
          if (query) p.set('q', query);
          else p.delete('q');
          navigate(`/buscar?${p.toString()}`);
        }}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          {q ? `Resultados para «${q}»` : 'Explorar anuncios'}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {results.length} anuncio{results.length === 1 ? '' : 's'}
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TypeToggle value={tipo === 'producto' || tipo === 'servicio' ? tipo : 'todos'} onChange={setTipo} />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                cat === c.id
                  ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                  : 'border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--brand-soft)]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <p className="mt-12 text-center text-[var(--ink-muted)]">
            No hay anuncios con esos filtros. Prueba otra búsqueda o{' '}
            <button
              type="button"
              className="font-semibold text-[var(--brand)] underline"
              onClick={() => navigate('/buscar')}
            >
              limpia los filtros
            </button>
            .
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

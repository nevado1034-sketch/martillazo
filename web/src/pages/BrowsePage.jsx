import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import TypeToggle from '../components/listings/TypeToggle.jsx';
import FilterPanel from '../components/listings/FilterPanel.jsx';
import RelatedCarousel from '../components/listings/RelatedCarousel.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { fetchRelatedListings } from '../api/listings.js';
import { mediaUrl } from '../api/config.js';
import {
  ALL_ATTRIBUTE_KEYS,
  PRICE_RANGES,
  SORT_OPTIONS,
  categoriesForType,
  conditionLabel,
  getCategoryDef,
  getDateRange,
} from '../data/taxonomy.js';

function parsePriceState(minPrice, maxPrice) {
  const min = minPrice === '' ? 0 : Number(minPrice);
  const max = maxPrice === '' ? null : Number(maxPrice);
  return { min, max };
}

export default function BrowsePage() {
  const { listings, loading, refreshListings } = useMarketplace();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [fetching, setFetching] = useState(false);
  const [related, setRelated] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  const state = useMemo(() => {
    const tipo = params.get('tipo') || 'todos';
    const categoryType = tipo === 'servicio' ? 'servicio' : 'producto';
    const rawCategory = params.get('cat') || '';
    const category = getCategoryDef(rawCategory, categoryType);

    return {
      q: params.get('q') || '',
      tipo,
      cat: category?.id || '',
      category,
      sub: category ? params.get('sub') || '' : '',
      condition: params.get('condition') || '',
      minPrice: params.get('minPrice') || '',
      maxPrice: params.get('maxPrice') || '',
      date: params.get('date') || '',
      sort: params.get('sort') || 'recent',
    };
  }, [params]);

  const apiParams = useMemo(
    () => ({
      tipo: state.tipo === 'todos' ? undefined : state.tipo,
      q: state.q || undefined,
      cat: state.cat || undefined,
      sub: state.sub || undefined,
      condition: state.condition || undefined,
      minPrice: state.minPrice || undefined,
      maxPrice: state.maxPrice || undefined,
      date: state.date || undefined,
      sort: state.sort !== 'recent' ? state.sort : undefined,
    }),
    [state],
  );

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    refreshListings(apiParams).finally(() => {
      if (!cancelled) setFetching(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiParams, refreshListings]);

  useEffect(() => {
    let cancelled = false;
    setRelatedLoading(true);
    const exclude = listings.map((l) => l.id);
    fetchRelatedListings({
      q: state.q || undefined,
      tipo: state.tipo === 'todos' ? undefined : state.tipo,
      cat: state.cat || undefined,
      exclude,
      limit: 12,
    })
      .then((data) => {
        if (cancelled) return;
        setRelated(
          (data || []).map((l) => ({
            ...l,
            images: (l.images || []).map((u) => mediaUrl(u)),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setRelated([]);
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [state.q, state.tipo, state.cat, listings]);

  const update = (mutator) => {
    const next = new URLSearchParams(params);
    mutator(next);
    setParams(next);
  };

  const clearContextFilters = (next) => {
    next.delete('sub');
    ALL_ATTRIBUTE_KEYS.forEach((key) => next.delete(key));
  };

  const changeTipo = (next) => {
    update((p) => {
      if (next === 'todos') p.delete('tipo');
      else p.set('tipo', next);
      p.delete('cat');
      clearContextFilters(p);
      if (next === 'servicio') p.delete('condition');
    });
  };

  const changeCategory = (id) => {
    update((p) => {
      if (!id || id === state.cat) p.delete('cat');
      else p.set('cat', id);
      clearContextFilters(p);
    });
  };

  const changeSubcategory = (id) => {
    update((p) => {
      if (!id || id === state.sub) p.delete('sub');
      else p.set('sub', id);
    });
  };

  const changePrice = ({ min, max }) => {
    update((p) => {
      if (min === '' || min == null) p.delete('minPrice');
      else p.set('minPrice', String(min));
      if (max === '' || max == null) p.delete('maxPrice');
      else p.set('maxPrice', String(max));
    });
  };

  const changeCondition = (value) => {
    update((p) => {
      if (!value) p.delete('condition');
      else p.set('condition', value);
    });
  };

  const changeDate = (value) => {
    update((p) => {
      if (!value) p.delete('date');
      else p.set('date', value);
    });
  };

  const changeSort = (value) => {
    update((p) => {
      if (!value || value === 'recent') p.delete('sort');
      else p.set('sort', value);
    });
  };

  const clearFilterValues = () => {
    update((p) => {
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
    });
  };

  const clearFilters = () => {
    update((p) => {
      p.delete('cat');
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
      p.delete('sort');
      clearContextFilters(p);
    });
  };

  const categories = categoriesForType(
    state.tipo === 'servicio' ? 'servicio' : 'producto',
  );
  const results = listings;

  const activeSubcategory = state.category?.subcategories.find(
    (sub) => sub.id === state.sub,
  );
  const priceState = parsePriceState(state.minPrice, state.maxPrice);
  const activePriceRange = PRICE_RANGES.find((range) => {
    return (
      (range.min || 0) === (priceState.min || 0) &&
      (range.max ?? null) === priceState.max
    );
  });
  const hasValueFilters = Boolean(
    state.condition || state.minPrice !== '' || state.maxPrice !== '' || state.date,
  );

  const activeFilters = [];
  if (state.category) {
    activeFilters.push({
      key: 'cat',
      label: state.category.label,
      clear: () => changeCategory(null),
    });
  }
  if (activeSubcategory) {
    activeFilters.push({
      key: 'sub',
      label: activeSubcategory.label,
      clear: () => changeSubcategory(null),
    });
  }
  if (state.condition) {
    activeFilters.push({
      key: 'condition',
      label: conditionLabel(state.condition),
      clear: () => changeCondition(''),
    });
  }
  if (priceState.min || priceState.max != null) {
    activeFilters.push({
      key: 'price',
      label: activePriceRange?.label || 'Precio seleccionado',
      clear: () => changePrice({ min: '', max: '' }),
    });
  }
  if (state.date) {
    activeFilters.push({
      key: 'date',
      label: getDateRange(state.date)?.label || state.date,
      clear: () => changeDate(''),
    });
  }

  const headerTitle = state.q
    ? `Resultados para «${state.q}»`
    : state.category
      ? state.category.label
      : 'Explorar anuncios';

  const headerSubtitle = state.q
    ? 'Ajusta tu búsqueda desde la categoría que te interese'
    : activeSubcategory
      ? activeSubcategory.label
      : state.category
        ? `${state.category.label} de segunda mano`
        : 'Productos y servicios cerca de ti, siempre en soles';

  const hasSubcategories = Boolean(state.category?.subcategories?.length);
  const exploreIsCategory = !hasSubcategories;
  const exploreItems = hasSubcategories ? state.category.subcategories : categories;
  const exploreTitle = hasSubcategories
    ? 'Elige un producto'
    : 'Elige una categoría';

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        searchValue={state.q}
        onSearchSubmit={(query) => {
          update((p) => {
            if (query) p.set('q', query);
            else p.delete('q');
          });
        }}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">
        <nav
          aria-label="Ruta de navegación"
          className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-muted)]"
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            className="hover:text-[var(--brand)] hover:underline"
          >
            Inicio
          </button>
          {state.q && !state.category && <span>/ Búsqueda</span>}
          {state.category && (
            <>
              <span>/</span>
              <span className="font-semibold text-[var(--ink)]">
                {state.category.label}
              </span>
            </>
          )}
        </nav>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-slogan mb-2 text-2xl font-extrabold leading-none tracking-tight text-[var(--brand-deep)] sm:text-3xl lg:text-4xl">
              ¿NO LO USAS?{' '}
              <span className="inline-block rounded-xl bg-[var(--coral-wash)] px-3 py-0.5 text-[var(--coral-deep)]">
                ¡VÉNDELO!
              </span>
            </p>
            <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
              {headerTitle}
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {headerSubtitle}
            </p>
          </div>
          <p className="text-sm text-[var(--ink-muted)]">
            {fetching || loading
              ? 'Buscando…'
              : `${results.length} anuncio${results.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <TypeToggle
            value={
              state.tipo === 'producto' || state.tipo === 'servicio'
                ? state.tipo
                : 'todos'
            }
            onChange={changeTipo}
          />
          <label className="ml-auto flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <span>Ordenar</span>
            <select
              value={state.sort}
              onChange={(event) => changeSort(event.target.value)}
              className="rounded-lg border border-[var(--line)] bg-white px-2.5 py-2 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--brand)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <section className="mt-6">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            {exploreTitle}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {exploreItems.map((item) => {
              const active = exploreIsCategory
                ? state.cat === item.id
                : state.sub === item.id;
              const choose = () =>
                exploreIsCategory
                  ? changeCategory(item.id)
                  : changeSubcategory(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={choose}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                      : 'border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--brand-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </section>

        {state.category && (
          <section
            aria-label="Filtros de anuncios"
            className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-3"
          >
            <FilterPanel
              condition={state.condition}
              date={state.date}
              minPrice={state.minPrice}
              maxPrice={state.maxPrice}
              isService={state.tipo === 'servicio'}
              hasFilters={hasValueFilters}
              onCondition={changeCondition}
              onDate={changeDate}
              onPrice={changePrice}
              onClear={clearFilterValues}
            />
          </section>
        )}

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={filter.clear}
                className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-soft)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] transition hover:border-[var(--brand)]"
              >
                {filter.label}
                <span
                  aria-hidden="true"
                  className="text-sm leading-none opacity-60 group-hover:opacity-100"
                >
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[var(--ink-muted)] underline hover:text-[var(--ink)]"
            >
              Limpiar todo
            </button>
          </div>
        )}

        {results.length === 0 && !loading && !fetching ? (
          <div className="mt-12 rounded-2xl border border-dashed border-[var(--line)] bg-white/70 p-8 text-center">
            <p className="text-[var(--ink-muted)]">
              No hay anuncios con esos filtros.
            </p>
            <button
              type="button"
              className="mt-3 font-semibold text-[var(--brand)] underline"
              onClick={() => navigate('/buscar')}
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div
            className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${
              fetching ? 'opacity-60' : ''
            }`}
          >
            {results.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}

        <RelatedCarousel
          title="También te puede interesar"
          listings={related}
          loading={relatedLoading}
        />
      </main>

      <SiteFooter />
    </div>
  );
}

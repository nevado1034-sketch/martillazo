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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const headerSubtitle = activeSubcategory
    ? activeSubcategory.label
    : state.category
      ? 'Filtros y subcategorías de esta categoría'
      : 'Productos de segunda mano y servicios locales en soles';

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
        <h1 className="font-display text-3xl font-bold text-[var(--ink)]">
          {headerTitle}
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{headerSubtitle}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <TypeToggle
            value={
              state.tipo === 'producto' || state.tipo === 'servicio'
                ? state.tipo
                : 'todos'
            }
            onChange={changeTipo}
          />
          <p className="text-sm text-[var(--ink-muted)]">
            {fetching || loading
              ? 'Buscando…'
              : `${results.length} anuncio${results.length === 1 ? '' : 's'}`}
          </p>
          <label className="ml-auto flex items-center gap-2 text-xs text-[var(--ink-muted)]">
            <span className="hidden sm:inline">Ordenar por</span>
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)] lg:hidden"
            >
              <span>Filtros</span>
              <span className="flex items-center gap-2 text-xs text-[var(--brand)]">
                {activeFilters.length > 0 && (
                  <span className="rounded-full bg-[var(--mint-soft)] px-2 py-0.5">
                    {activeFilters.length}
                  </span>
                )}
                {filtersOpen ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>

            <div
              className={`${filtersOpen ? 'block' : 'hidden'} mt-3 lg:mt-0 lg:block`}
            >
              <FilterPanel
                categories={categories}
                category={state.category}
                subcategory={state.sub}
                condition={state.condition}
                date={state.date}
                minPrice={state.minPrice}
                maxPrice={state.maxPrice}
                isService={state.tipo === 'servicio'}
                hasFilters={activeFilters.length > 0}
                onSelectCategory={changeCategory}
                onSelectSubcategory={changeSubcategory}
                onCondition={changeCondition}
                onDate={changeDate}
                onPrice={changePrice}
                onClear={clearFilters}
              />
            </div>
          </aside>

          <section className="min-w-0">
            {/* Atajo de categorías en móvil */}
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 lg:hidden">
              <button
                type="button"
                onClick={() => changeCategory(null)}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  !state.category
                    ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                    : 'border-[var(--line)] bg-white text-[var(--ink-muted)]'
                }`}
              >
                Todas
              </button>
              {categories.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeCategory(item.id)}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    state.cat === item.id
                      ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                      : 'border-[var(--line)] bg-white text-[var(--ink-muted)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {activeFilters.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={filter.clear}
                    className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-soft)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] transition hover:border-[var(--brand)]"
                  >
                    {filter.label}
                    <span aria-hidden="true" className="text-sm leading-none opacity-60 group-hover:opacity-100">
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
                className={`mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 ${
                  fetching ? 'opacity-60' : ''
                }`}
              >
                {results.map((listing, i) => (
                  <ListingCard key={listing.id} listing={listing} index={i} />
                ))}
              </div>
            )}
          </section>
        </div>

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

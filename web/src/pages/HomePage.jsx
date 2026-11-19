import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import HomeBannerSlider from '../components/home/HomeBannerSlider.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import TypeToggle from '../components/listings/TypeToggle.jsx';
import FilterPanel from '../components/listings/FilterPanel.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import {
  PRICE_RANGES,
  PRODUCT_CATEGORIES,
  conditionLabel,
  getCategoryDef,
  getDateRange,
} from '../data/taxonomy.js';

export default function HomePage() {
  const { listings, loading, error, refreshListings } = useMarketplace();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const productsOpen = params.get('productos') === '1';
  const selectedCatId = params.get('cat') || '';
  const selectedSubId = params.get('sub') || '';
  const condition = params.get('condition') || '';
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const date = params.get('date') || '';

  const [pillar, setPillar] = useState(productsOpen ? 'producto' : 'todos');
  const [q, setQ] = useState('');

  useEffect(() => {
    refreshListings().catch(() => {});
  }, [refreshListings]);

  useEffect(() => {
    setPillar(productsOpen ? 'producto' : 'todos');
  }, [productsOpen]);

  const updateParams = (mutator) => {
    const next = new URLSearchParams(params);
    mutator(next);
    setParams(next);
  };

  const changePillar = (next) => {
    setPillar(next);
    updateParams((p) => {
      if (next === 'producto') {
        p.set('productos', '1');
        return;
      }
      p.delete('productos');
      p.delete('cat');
      p.delete('sub');
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
    });
  };

  const clearProductFilters = () => {
    updateParams((p) => {
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
    });
  };

  const closeProducts = () => {
    setPillar('todos');
    updateParams((p) => {
      p.delete('productos');
      p.delete('cat');
      p.delete('sub');
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
    });
  };

  const selectCategory = (id) => {
    updateParams((p) => {
      if (!id || id === selectedCatId) {
        p.delete('cat');
        p.delete('sub');
      } else {
        p.set('cat', id);
        p.delete('sub');
      }
      p.delete('condition');
      p.delete('minPrice');
      p.delete('maxPrice');
      p.delete('date');
    });
  };

  const selectSubcategory = (id) => {
    updateParams((p) => {
      if (!id || id === selectedSubId) p.delete('sub');
      else p.set('sub', id);
    });
  };

  const changeCondition = (value) => {
    updateParams((p) => {
      if (!value) p.delete('condition');
      else p.set('condition', value);
    });
  };

  const changeDate = (value) => {
    updateParams((p) => {
      if (!value) p.delete('date');
      else p.set('date', value);
    });
  };

  const changePrice = ({ min, max }) => {
    updateParams((p) => {
      if (min === '' || min == null) p.delete('minPrice');
      else p.set('minPrice', String(min));
      if (max === '' || max == null) p.delete('maxPrice');
      else p.set('maxPrice', String(max));
    });
  };

  const category = getCategoryDef(selectedCatId, 'producto');
  const selectedSubcategory = category?.subcategories.find(
    (sub) => sub.id === selectedSubId,
  );
  const min = minPrice === '' ? 0 : Number(minPrice);
  const max = maxPrice === '' ? Number.POSITIVE_INFINITY : Number(maxPrice);
  const dateHours = date ? getDateRange(date)?.hours : null;
  const hasValueFilters = Boolean(condition || minPrice !== '' || maxPrice !== '' || date);

  const filtered = useMemo(() => {
    let result = listings.filter((l) => {
      if (pillar === 'producto') return l.type === 'producto';
      if (pillar === 'servicio') return l.type === 'servicio';
      return true;
    });

    if (productsOpen && category) {
      result = result.filter((l) => l.category === category.id);
      if (selectedSubId) {
        result = result.filter((l) => l.subcategory === selectedSubId);
      }
      if (condition) result = result.filter((l) => l.condition === condition);
      result = result.filter((l) => {
        const price = Number(l.price);
        return price >= min && price <= max;
      });
      if (dateHours) {
        const cutoff = Date.now() - dateHours * 60 * 60 * 1000;
        result = result.filter(
          (l) => new Date(l.createdAt).getTime() >= cutoff,
        );
      }
    }

    return result;
  }, [
    listings,
    pillar,
    productsOpen,
    category,
    selectedSubId,
    condition,
    min,
    max,
    dateHours,
  ]);

  const near = filtered.slice(0, 8);

  const activePriceRange = PRICE_RANGES.find(
    (range) =>
      (range.min || 0) === min &&
      (range.max ?? Number.POSITIVE_INFINITY) === max,
  );

  const productChips = [];
  if (category) {
    productChips.push({
      key: 'cat',
      label: category.label,
      clear: () => selectCategory(null),
    });
  }
  if (selectedSubcategory) {
    productChips.push({
      key: 'sub',
      label: selectedSubcategory.label,
      clear: () => selectSubcategory(null),
    });
  }
  if (condition) {
    productChips.push({
      key: 'condition',
      label: conditionLabel(condition),
      clear: () => changeCondition(''),
    });
  }
  if (minPrice !== '' || maxPrice !== '') {
    productChips.push({
      key: 'price',
      label: activePriceRange?.label || 'Precio seleccionado',
      clear: () => changePrice({ min: '', max: '' }),
    });
  }
  if (date) {
    productChips.push({
      key: 'date',
      label: getDateRange(date)?.label || date,
      clear: () => changeDate(''),
    });
  }

  const goSearch = (e) => {
    e.preventDefault();
    const searchParams = new URLSearchParams();
    if (q.trim()) searchParams.set('q', q.trim());
    if (pillar !== 'todos') searchParams.set('tipo', pillar);
    navigate(`/buscar?${searchParams.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HomeBannerSlider />

        <section
          id="cerca"
          className="scroll-mt-20 border-b border-[var(--line)] bg-white/65 py-12 sm:py-14"
        >
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
              Cerca de ti
            </h2>
            <p className="mt-2 max-w-xl text-sm text-[var(--ink-muted)] sm:text-base">
              Productos de segunda mano y servicios locales, al mismo nivel.
            </p>

            <form
              onSubmit={goSearch}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <TypeToggle value={pillar} onChange={changePillar} />
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--line)] bg-white focus-within:ring-2 focus-within:ring-[var(--mint-soft)]">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Qué buscas?"
                  className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="bg-[var(--primary-celeste)] px-4 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
                >
                  Buscar
                </button>
              </div>
            </form>

            {productsOpen && (
              <section
                id="productos"
                className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-4 sm:p-6 animate-fade-in"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-[var(--ink)]">
                      Productos
                    </h3>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      Toca una categoría para ver sus anuncios y filtros aquí.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeProducts}
                    className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-muted)] hover:border-[var(--brand-soft)] hover:text-[var(--ink)]"
                  >
                    Cerrar
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {PRODUCT_CATEGORIES.map((item) => {
                    const active = selectedCatId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => selectCategory(item.id)}
                        className={`rounded-xl border px-3 py-3 text-left underline decoration-[var(--brand)] decoration-2 underline-offset-4 transition ${
                          active
                            ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--ink)]'
                            : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--brand-soft)]'
                        }`}
                      >
                        <span className="block text-sm font-semibold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] opacity-70">
                          {item.subcategories.length > 0
                            ? `${item.subcategories.length} tipos`
                            : 'Ver anuncios'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {category && (
                  <div className="mt-6 border-t border-[var(--line)] pt-5">
                    <h4 className="font-display text-lg font-bold text-[var(--ink)]">
                      {category.label}
                    </h4>

                    {category.subcategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {category.subcategories.map((sub) => {
                          const active = selectedSubId === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              aria-pressed={active}
                              onClick={() => selectSubcategory(sub.id)}
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                active
                                  ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                                  : 'border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--brand-soft)] hover:text-[var(--ink)]'
                              }`}
                            >
                              {sub.label}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]/60 p-3">
                      <FilterPanel
                        condition={condition}
                        date={date}
                        minPrice={minPrice}
                        maxPrice={maxPrice}
                        isService={false}
                        hasFilters={hasValueFilters}
                        onCondition={changeCondition}
                        onDate={changeDate}
                        onPrice={changePrice}
                        onClear={clearProductFilters}
                      />
                    </div>

                    {productChips.length > 0 && (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {productChips.map((chip) => (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={chip.clear}
                            className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--brand-soft)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-deep)] transition hover:border-[var(--brand)]"
                          >
                            {chip.label}
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
                          onClick={closeProducts}
                          className="text-xs font-semibold text-[var(--ink-muted)] underline hover:text-[var(--ink)]"
                        >
                          Limpiar todo
                        </button>
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {filtered.length > 0 ? (
                        filtered.map((listing, i) => (
                          <ListingCard
                            key={listing.id}
                            listing={listing}
                            index={i}
                          />
                        ))
                      ) : (
                        <p className="col-span-full py-6 text-center text-sm text-[var(--ink-muted)]">
                          No hay anuncios con esos filtros.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            )}

            {error && (
              <p className="mt-6 text-sm text-[var(--coral-deep)]">
                {error} — ¿está corriendo la API en :4000?
              </p>
            )}

            {!productsOpen && (
              <>
                {loading && !near.length ? (
                  <p className="mt-10 text-sm text-[var(--ink-muted)]">
                    Cargando anuncios…
                  </p>
                ) : (
                  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {near.map((listing, i) => (
                      <ListingCard key={listing.id} listing={listing} index={i} />
                    ))}
                  </div>
                )}

                <div className="mt-8 text-center">
                  <Link
                    to={pillar === 'todos' ? '/buscar' : `/buscar?tipo=${pillar}`}
                    className="text-sm font-semibold text-[var(--brand)] hover:underline"
                  >
                    Ver todos los anuncios →
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-5 px-4 md:grid-cols-2">
            <Link
              to="/publicar?tipo=producto"
              className="group rounded-2xl border border-[var(--line)] bg-[var(--mint-wash)] p-7 transition hover:border-[var(--brand-soft)] hover:shadow-md sm:p-8"
            >
              <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
                Vender un producto
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                Publica en pocos pasos: foto, precio en S/ y listo.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-[var(--brand)] transition group-hover:translate-x-1">
                Empezar →
              </span>
            </Link>
            <Link
              to="/publicar?tipo=servicio"
              className="group rounded-2xl border border-[var(--line)] bg-[var(--coral-wash)] p-7 transition hover:border-[var(--coral)]/40 hover:shadow-md sm:p-8"
            >
              <h2 className="font-display text-2xl font-bold text-[var(--ink)]">
                Ofrecer un servicio
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                Tarifa S/ por hora, desde o fijo — contactan por WhatsApp.
              </p>
              <span className="mt-4 inline-block text-sm font-semibold text-[var(--coral-deep)] transition group-hover:translate-x-1">
                Empezar →
              </span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

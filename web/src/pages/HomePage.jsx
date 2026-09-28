import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import HomeBannerSlider from '../components/home/HomeBannerSlider.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import TypeToggle from '../components/listings/TypeToggle.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';

export default function HomePage() {
  const { listings, loading, error, refreshListings } = useMarketplace();
  const navigate = useNavigate();
  const [pillar, setPillar] = useState('todos');
  const [q, setQ] = useState('');

  useEffect(() => {
    refreshListings().catch(() => {});
  }, [refreshListings]);

  const filtered = listings.filter((l) => {
    if (pillar === 'producto') return l.type === 'producto';
    if (pillar === 'servicio') return l.type === 'servicio';
    return true;
  });

  const near = filtered.slice(0, 8);

  const goSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (pillar !== 'todos') params.set('tipo', pillar);
    navigate(`/buscar?${params.toString()}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HomeBannerSlider />

        <section id="cerca" className="scroll-mt-20 border-b border-[var(--line)] bg-white/65 py-12 sm:py-14">
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
              <TypeToggle value={pillar} onChange={setPillar} />
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

            {error && (
              <p className="mt-6 text-sm text-[var(--coral-deep)]">
                {error} — ¿está corriendo la API en :4000?
              </p>
            )}

            {loading && !near.length ? (
              <p className="mt-10 text-sm text-[var(--ink-muted)]">Cargando anuncios…</p>
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

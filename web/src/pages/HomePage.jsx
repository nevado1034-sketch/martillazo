import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import HomeBannerSlider from '../components/home/HomeBannerSlider.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { mediaUrl } from '../api/config.js';

const FEATURED_ID = 'aebe3cc3-56d0-4d1a-90f7-ea614c2aeab4';

export default function HomePage() {
  const navigate = useNavigate();
  const { listings, refreshListings } = useMarketplace();
  const [q, setQ] = useState('');

  useEffect(() => {
    refreshListings().catch(() => {});
  }, [refreshListings]);

  const featured = useMemo(() => {
    const tv = listings.find((item) => item.id === FEATURED_ID);
    if (tv) return tv;
    return listings.find((item) => item.images?.length > 0) || null;
  }, [listings]);

  const goSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate(`/buscar?${params.toString()}`);
  };

  const featuredImage = featured?.images?.[0]
    ? mediaUrl(featured.images[0])
    : '';

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <HomeBannerSlider />

        <section className="border-b border-[var(--line)] bg-white/65 py-10 sm:py-12">
          <div className="mx-auto max-w-6xl px-4">
            <form
              onSubmit={goSearch}
              className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center"
            >
              <label className="sr-only" htmlFor="home-search">
                Buscar productos o servicios
              </label>
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--mint-soft)]">
                <input
                  id="home-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="¿Qué buscas?"
                  className="min-w-0 flex-1 px-4 py-2.5 text-sm outline-none placeholder:text-[var(--ink-faint)]"
                />
                <button
                  type="submit"
                  className="bg-[var(--primary-celeste)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
                >
                  Buscar
                </button>
              </div>
            </form>
          </div>
        </section>

        {featured && (
          <section className="border-b border-[var(--line)] bg-white/65 py-10 sm:py-12">
            <div className="mx-auto max-w-6xl px-4">
              <h2 className="font-display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
                Destacado
              </h2>
              <Link
                to={`/anuncio/${featured.id}`}
                className="group mt-5 grid overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition hover:border-[var(--brand-soft)] hover:shadow-md md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface)]">
                  {featuredImage ? (
                    <img
                      src={featuredImage}
                      alt={featured.title}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[var(--ink-faint)]">
                      Sin foto
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-[var(--coral)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                    Destacado
                  </span>
                </div>

                <div className="flex flex-col justify-center p-6 sm:p-8">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--brand)]">
                    {featured.category || 'Anuncio'}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-[var(--ink)]">
                    {featured.title}
                  </h3>
                  {featured.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--ink-muted)]">
                      {featured.description}
                    </p>
                  )}
                  <p className="mt-4 font-display text-2xl font-bold text-[var(--brand-deep)]">
                    S/ {featured.price}
                  </p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-[var(--brand)] transition group-hover:translate-x-1">
                    Ver anuncio →
                  </span>
                </div>
              </Link>
            </div>
          </section>
        )}

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

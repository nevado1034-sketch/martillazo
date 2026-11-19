import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import HomeBannerSlider from '../components/home/HomeBannerSlider.jsx';

export default function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const goSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    navigate(`/buscar?${params.toString()}`);
  };

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

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { formatPrice } from '../utils/format.js';

export default function MyOffersPage() {
  const { token, requireAuth, setAuthOpen } = useAuth();
  const { loadMyOffers } = useMarketplace();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setOffers([]);
      return;
    }
    setLoading(true);
    loadMyOffers()
      .then(setOffers)
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, [token, loadMyOffers]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Mis ofertas</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Propuestas de precio que enviaste. El vendedor también las ve en cada anuncio.
        </p>

        {!token && (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <p className="text-sm text-[var(--ink-muted)]">
              Inicia sesión para ver tus ofertas.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                requireAuth();
                setAuthOpen(true);
              }}
            >
              Entrar
            </button>
          </div>
        )}

        {token && loading && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Cargando…</p>
        )}

        {token && !loading && offers.length === 0 && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">
            Aún no has propuesto precio.{' '}
            <Link to="/buscar" className="font-semibold text-[var(--brand)] hover:underline">
              Explorar anuncios
            </Link>
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {offers.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/anuncio/${o.listingId}`}
                  className="font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                >
                  {o.listingTitle}
                </Link>
                <span className="font-display text-lg font-semibold text-[var(--brand)]">
                  {formatPrice(o.amount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">Estado: {o.status}</p>
              {o.message && (
                <p className="mt-2 text-sm text-[var(--ink-muted)]">{o.message}</p>
              )}
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}

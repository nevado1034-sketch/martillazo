import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { fetchMyListings } from '../api/listings.js';
import { mediaUrl } from '../api/config.js';

function normalize(listing) {
  if (!listing) return null;
  return {
    ...listing,
    images: (listing.images || []).map((u) => mediaUrl(u)),
    priceMode: listing.priceMode || listing.price_mode,
    availableToday: listing.availableToday ?? listing.available_today,
  };
}

export default function MyListingsPage() {
  const { token, requireAuth, setAuthOpen } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setListings([]);
      return;
    }
    setLoading(true);
    fetchMyListings(token)
      .then((data) => setListings((data || []).map(normalize)))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-[var(--text-dark)]">
              Mis anuncios
            </h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              Productos y servicios que publicaste en PulgasYa.
            </p>
          </div>
          <Link
            to="/publicar"
            className="rounded-xl bg-[var(--cta-orange)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
          >
            Publicar
          </Link>
        </div>

        {!token && (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <p className="text-sm text-[var(--ink-muted)]">
              Entra para ver tus anuncios.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
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

        {token && !loading && listings.length === 0 && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">
            Aún no has publicado.{' '}
            <Link to="/publicar" className="font-semibold text-[var(--primary-celeste)] hover:underline">
              Publicar ahora
            </Link>
          </p>
        )}

        {listings.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

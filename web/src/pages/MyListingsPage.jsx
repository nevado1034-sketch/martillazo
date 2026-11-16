import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import ListingCard from '../components/listings/ListingCard.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
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

const STATUS = {
  active: {
    label: 'Activo',
    className: 'bg-[var(--mint-wash)] text-[var(--brand-deep)]',
  },
  sold: {
    label: 'Vendido',
    className: 'bg-[var(--surface)] text-[var(--ink-muted)]',
  },
  archived: {
    label: 'Pausado',
    className: 'bg-[var(--coral-wash)] text-[var(--coral-deep)]',
  },
};

const ACTION_BTN =
  'rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50';

export default function MyListingsPage() {
  const { token, requireAuth, setAuthOpen } = useAuth();
  const { changeListingStatus, removeListing } = useMarketplace();
  const { push } = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

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

  const runStatus = async (listing, status) => {
    setBusyId(listing.id);
    try {
      const updated = normalize(await changeListingStatus(listing.id, status));
      setListings((prev) =>
        prev.map((l) => (l.id === updated.id ? updated : l)),
      );
      push(
        status === 'active'
          ? 'Anuncio activado'
          : status === 'sold'
            ? 'Marcado como vendido'
            : 'Anuncio pausado',
      );
    } catch (err) {
      push(err.message || 'No se pudo cambiar el estado');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (listing) => {
    setBusyId(listing.id);
    try {
      await removeListing(listing.id);
      setListings((prev) => prev.filter((l) => l.id !== listing.id));
      setConfirmId(null);
      push('Anuncio eliminado');
    } catch (err) {
      push(err.message || 'No se pudo eliminar el anuncio');
    } finally {
      setBusyId(null);
    }
  };

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
              Inicia sesión para ver tus anuncios.
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
            {listings.map((listing, i) => {
              const badge = STATUS[listing.status] || STATUS.active;
              const busy = busyId === listing.id;
              return (
                <div key={listing.id} className="flex flex-col">
                  <ListingCard listing={listing} index={i} />
                  <div className="mt-2 rounded-xl border border-[var(--line)] bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-[var(--ink-faint)]">
                        {listing.type === 'servicio' ? 'Servicio' : 'Producto'}
                      </span>
                    </div>

                    {listing.status !== 'active' && (
                      <p className="mt-2 text-[11px] leading-snug text-[var(--ink-muted)]">
                        {listing.status === 'sold'
                          ? 'Vendido: no aparece en las búsquedas.'
                          : 'Pausado: no aparece en las búsquedas.'}
                      </p>
                    )}

                    {confirmId === listing.id ? (
                      <div className="mt-3 rounded-lg bg-[var(--coral-wash)] p-2">
                        <p className="text-xs font-medium text-[var(--coral-deep)]">
                          ¿Eliminar este anuncio para siempre?
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(listing)}
                            className="rounded-lg bg-[var(--coral-deep)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {busy ? 'Eliminando…' : 'Sí, eliminar'}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmId(null)}
                            className="rounded-lg border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          to={`/publicar?editar=${listing.id}`}
                          className={ACTION_BTN}
                        >
                          Editar
                        </Link>
                        {listing.status === 'active' ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runStatus(listing, 'archived')}
                              className={ACTION_BTN}
                            >
                              Pausar
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runStatus(listing, 'sold')}
                              className={ACTION_BTN}
                            >
                              Marcar vendido
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runStatus(listing, 'active')}
                            className={ACTION_BTN}
                          >
                            {listing.status === 'sold' ? 'Reactivar' : 'Activar'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setConfirmId(listing.id)}
                          className="rounded-lg border border-[var(--coral)] px-3 py-1.5 text-xs font-semibold text-[var(--coral-deep)] transition hover:bg-[var(--coral-wash)] disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

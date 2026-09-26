import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import OfferModal from '../components/listings/OfferModal.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  formatPrice,
  formatRating,
  formatDistance,
  relativeDay,
} from '../utils/format.js';

export default function ListingDetailPage() {
  const { id } = useParams();
  const { getListing, makeOffer, offersForListing } = useMarketplace();
  const { push } = useToast();
  const listing = getListing(id);
  const [offerOpen, setOfferOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 text-center">
          <h1 className="font-display text-2xl font-bold">Anuncio no encontrado</h1>
          <Link to="/buscar" className="mt-4 text-[var(--brand)] hover:underline">
            Volver a buscar
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const isService = listing.type === 'servicio';
  const priceLabel = formatPrice(listing.price, {
    mode: isService ? listing.priceMode : undefined,
    currency: listing.currency,
  });
  const images = listing.images?.length ? listing.images : [];
  const offers = offersForListing(listing.id);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
        <Link
          to="/buscar"
          className="text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--brand)]"
        >
          ← Volver
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <div>
            <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--mint-wash)]">
              {images[imgIdx] ? (
                <img
                  src={images[imgIdx]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--ink-faint)]">
                  Sin imagen
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2">
                {images.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setImgIdx(i)}
                    className={`h-16 w-20 overflow-hidden rounded-lg border ${
                      i === imgIdx
                        ? 'border-[var(--brand)]'
                        : 'border-[var(--line)] opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="animate-hero-in">
            <span className="inline-block rounded-lg bg-[var(--mint-soft)] px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-deep)]">
              {isService ? 'Servicio' : 'Producto'}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-[var(--ink)] sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-3 font-display text-3xl font-semibold text-[var(--brand)]">
              {priceLabel}
            </p>
            {!isService && listing.negotiable && (
              <p className="mt-1 text-sm text-[var(--ink-muted)]">Precio negociable</p>
            )}

            <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--ink-muted)]">
              <span>{listing.location}</span>
              {listing.distanceKm != null && (
                <span>· {formatDistance(listing.distanceKm)}</span>
              )}
              <span>· {relativeDay(listing.createdAt)}</span>
            </div>

            {/* Trust */}
            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                {isService ? 'Prestado por' : 'Vendido por'}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{listing.seller.name}</p>
                  <p className="text-sm text-[var(--ink-muted)]">
                    ★ {formatRating(listing.seller.rating)} · {listing.seller.reviews}{' '}
                    valoraciones
                    {listing.seller.verified ? ' · Verificado' : ''}
                  </p>
                </div>
              </div>
            </div>

            {isService ? (
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Tarifa</dt>
                  <dd className="mt-0.5 font-semibold">{priceLabel}</dd>
                </div>
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Zona</dt>
                  <dd className="mt-0.5 font-semibold">{listing.zone || listing.location}</dd>
                </div>
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Disponibilidad</dt>
                  <dd className="mt-0.5 font-semibold">
                    {listing.availableToday ? 'Disponible hoy' : 'Consultar'}
                  </dd>
                </div>
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Categoría</dt>
                  <dd className="mt-0.5 font-semibold capitalize">{listing.category}</dd>
                </div>
              </dl>
            ) : (
              <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Estado</dt>
                  <dd className="mt-0.5 font-semibold">{listing.condition}</dd>
                </div>
                <div className="rounded-xl bg-[var(--surface)] p-3">
                  <dt className="text-[var(--ink-faint)]">Entrega</dt>
                  <dd className="mt-0.5 font-semibold">
                    {listing.shipping === 'envio' ? 'Envío disponible' : 'Sólo en persona'}
                  </dd>
                </div>
              </dl>
            )}

            <div className="mt-6">
              <h2 className="font-display text-lg font-bold">Descripción</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--ink-muted)]">
                {listing.description}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setOfferOpen(true)}
                className="flex-1 rounded-xl bg-[var(--coral)] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--coral-deep)] hover:scale-[1.01] active:scale-[0.99]"
              >
                Proponer precio
              </button>
              <button
                type="button"
                onClick={() =>
                  push(
                    isService
                      ? 'Chat y reserva llegan en la siguiente fase.'
                      : 'Chat llega en la siguiente fase. Mientras, propone un precio.',
                  )
                }
                className="flex-1 rounded-xl border border-[var(--line)] bg-white px-5 py-3.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--brand-soft)]"
              >
                {isService ? 'Pedir presupuesto' : 'Contactar'}
              </button>
            </div>

            {offers.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold">
                  Ofertas en este anuncio ({offers.length})
                </h2>
                <ul className="mt-3 space-y-2">
                  {offers.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm"
                    >
                      <span className="font-semibold text-[var(--brand)]">
                        {formatPrice(o.amount)}
                      </span>
                      <span className="text-[var(--ink-muted)]">
                        {' '}
                        · {o.buyerName} · {o.status}
                      </span>
                      {o.message && (
                        <p className="mt-1 text-[var(--ink-muted)]">{o.message}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />

      <OfferModal
        listing={listing}
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        onSubmit={({ amount, message, buyerName }) => {
          makeOffer({
            listingId: listing.id,
            amount,
            message,
            buyerName,
          });
          setOfferOpen(false);
          push('Oferta enviada. El vendedor la verá aquí (MVP local).');
        }}
      />
    </div>
  );
}

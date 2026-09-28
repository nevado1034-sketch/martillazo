import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import OfferModal from '../components/listings/OfferModal.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import {
  formatPrice,
  formatRating,
  relativeDay,
} from '../utils/format.js';
import {
  buildWhatsAppLink,
  contactWhatsAppText,
  offerWhatsAppText,
} from '../utils/whatsapp.js';
import { buyNow } from '../api/escrow.js';
import ListingGallery from '../components/listings/ListingGallery.jsx';

export default function ListingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getListing, makeOffer, loadOffers } = useMarketplace();
  const { user, token, requireAuth } = useAuth();
  const { push } = useToast();
  const [buyBusy, setBuyBusy] = useState(false);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offers, setOffers] = useState([]);
  const [isSeller, setIsSeller] = useState(false);
  const [lastOffer, setLastOffer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getListing(id)
      .then((data) => {
        if (!cancelled) setListing(data);
      })
      .catch(() => {
        if (!cancelled) setListing(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getListing]);

  useEffect(() => {
    if (!token || !id) {
      setOffers([]);
      return;
    }
    loadOffers(id)
      .then((data) => {
        setOffers(data.offers || []);
        setIsSeller(Boolean(data.isSeller));
      })
      .catch(() => setOffers([]));
  }, [token, id, loadOffers, lastOffer]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto flex flex-1 items-center px-4 text-[var(--ink-muted)]">
          Cargando anuncio…
        </main>
        <SiteFooter />
      </div>
    );
  }

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
  const amSeller = Boolean(
    isSeller || (user?.id && user.id === listing.seller?.id),
  );
  const priceLabel = formatPrice(listing.price, {
    mode: isService ? listing.priceMode : undefined,
    currency: listing.currency,
  });
  const images = listing.images?.length ? listing.images : [];

  const waContact = buildWhatsAppLink({
    phone: listing.seller?.phone,
    text: contactWhatsAppText({
      listingTitle: listing.title,
      buyerName: user?.fullName,
    }),
  });

  const openOffer = () => {
    if (!requireAuth('offer')) return;
    setOfferOpen(true);
  };

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
            <ListingGallery images={images} alt={listing.title} />
          </div>

          <div className="animate-hero-in">
            <span className="inline-block rounded-md bg-[var(--mint-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--brand-deep)]">
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
              <span>· {relativeDay(listing.createdAt)}</span>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
                {isService ? 'Prestado por' : 'Vendido por'}
              </p>
              <div className="mt-2">
                <p className="font-semibold text-[var(--ink)]">{listing.seller.name}</p>
                <p className="text-sm text-[var(--ink-muted)]">
                  ★ {formatRating(listing.seller.rating)} · {listing.seller.reviews}{' '}
                  valoraciones
                  {listing.seller.verified ? ' · Verificado' : ''}
                </p>
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
                    {listing.shipping === 'envio' ? 'Envío / delivery' : 'Sólo en persona'}
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

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {!amSeller && listing.status === 'active' && (
                <button
                  type="button"
                  disabled={buyBusy}
                  onClick={async () => {
                    if (!requireAuth('offer')) return;
                    setBuyBusy(true);
                    try {
                      const order = await buyNow(token, listing.id);
                      push('Pedido creado — paga en custodia PulgasYa');
                      navigate(`/pedido/${order.id}`);
                    } catch (err) {
                      push(err.message || 'No se pudo crear el pedido');
                    } finally {
                      setBuyBusy(false);
                    }
                  }}
                  className="flex-1 rounded-xl bg-[var(--cta-orange)] px-5 py-3.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
                >
                  Comprar ahora (custodia)
                </button>
              )}
              {waContact ? (
                <a
                  href={waContact}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-xl bg-[#25D366] px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:brightness-95 hover:scale-[1.01] active:scale-[0.99]"
                >
                  WhatsApp al vendedor
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    push('Este vendedor aún no tiene WhatsApp en su perfil.')
                  }
                  className="flex-1 rounded-xl bg-[#25D366]/70 px-5 py-3.5 text-sm font-semibold text-white"
                >
                  WhatsApp no disponible
                </button>
              )}
              <button
                type="button"
                onClick={openOffer}
                className="flex-1 rounded-xl border border-[var(--primary-celeste)] px-5 py-3.5 text-sm font-semibold text-[var(--primary-celeste)] transition hover:bg-[var(--mint-wash)]"
              >
                Proponer precio
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--ink-faint)]">
              El pago va a custodia PulgasYa (no al vendedor). Comisión 10% al
              liberar. Sandbox hasta conectar Culqi/Niubiz/MP.
            </p>

            {lastOffer && (
              <div className="mt-4 rounded-xl border border-[var(--mint-soft)] bg-[var(--mint-wash)] p-4 text-sm animate-rise">
                <p className="font-semibold text-[var(--brand-deep)]">
                  Oferta enviada: {formatPrice(lastOffer.amount)}
                </p>
                <p className="mt-1 text-[var(--ink-muted)]">
                  El vendedor la ve en este anuncio. También puedes escribirle por WhatsApp.
                </p>
                {waContact && (
                  <a
                    href={buildWhatsAppLink({
                      phone: listing.seller?.phone,
                      text: offerWhatsAppText({
                        listingTitle: listing.title,
                        amount: lastOffer.amount,
                        buyerName: user?.fullName,
                      }),
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block font-semibold text-[#128C7E] hover:underline"
                  >
                    Enviar oferta por WhatsApp →
                  </a>
                )}
              </div>
            )}

            {token && offers.length > 0 && (
              <div className="mt-8">
                <h2 className="font-display text-lg font-bold">
                  {isSeller ? 'Ofertas recibidas' : 'Tus ofertas'} ({offers.length})
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
                        · {o.buyer?.name} · {o.status}
                      </span>
                      {o.message && (
                        <p className="mt-1 text-[var(--ink-muted)]">{o.message}</p>
                      )}
                      {isSeller && o.buyer?.phone && (
                        <a
                          href={buildWhatsAppLink({
                            phone: o.buyer.phone,
                            text: `Hola ${o.buyer.name}, vi tu oferta de S/ ${o.amount} por «${listing.title}» en PulgasYa.`,
                          })}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block text-xs font-semibold text-[#128C7E] hover:underline"
                        >
                          Responder por WhatsApp
                        </a>
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
        onSubmit={async ({ amount, message }) => {
          const offer = await makeOffer({
            listingId: listing.id,
            amount,
            message,
          });
          setLastOffer(offer);
          setOfferOpen(false);
          push('Oferta guardada. Puedes avisar al vendedor por WhatsApp.');
        }}
      />
    </div>
  );
}

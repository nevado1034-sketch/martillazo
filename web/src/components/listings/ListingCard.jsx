import { Link } from 'react-router-dom';
import { formatPrice, formatRating, formatDistance } from '../../utils/format.js';

export default function ListingCard({ listing, index = 0 }) {
  const isService = listing.type === 'servicio';
  const priceLabel = formatPrice(listing.price, {
    mode: isService ? listing.priceMode : undefined,
    currency: listing.currency,
  });
  const img = listing.images?.[0];

  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className="group block animate-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/95 transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-soft)] hover:shadow-[0_12px_28px_-16px_rgba(58,124,165,0.35)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--mint-wash)]">
          {img ? (
            <img
              src={img}
              alt=""
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--ink-faint)]">
              Sin foto
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
            {isService ? 'Servicio' : 'Producto'}
          </span>
        </div>
        <div className="space-y-1.5 p-3.5">
          <p className="font-display text-lg font-semibold tracking-tight text-[var(--ink)]">
            {priceLabel}
          </p>
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--ink)]">
            {listing.title}
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--ink-muted)]">
            <span>
              {listing.seller?.name}
              {listing.seller?.rating != null && (
                <> · ★ {formatRating(listing.seller.rating)}</>
              )}
            </span>
            {listing.distanceKm != null && (
              <span>· {formatDistance(listing.distanceKm)}</span>
            )}
          </p>
          {isService && listing.availableToday && (
            <p className="text-xs font-semibold text-[var(--brand)]">Disponible hoy</p>
          )}
        </div>
      </article>
    </Link>
  );
}

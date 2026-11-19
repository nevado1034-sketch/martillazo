import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice, formatRating, formatDistance } from '../../utils/format.js';
import { conditionLabel } from '../../data/taxonomy.js';

export default function ListingCard({ listing, index = 0 }) {
  const [imgError, setImgError] = useState(false);
  const isService = listing.type === 'servicio';
  const priceLabel = formatPrice(listing.price, {
    mode: isService ? listing.priceMode : undefined,
    currency: listing.currency,
  });
  const img = listing.images?.[0];
  const rating = listing.seller?.rating;
  const reviews = listing.seller?.reviews ?? 0;
  const condition = isService ? '' : conditionLabel(listing.condition);

  return (
    <Link
      to={`/anuncio/${listing.id}`}
      className="group block animate-rise"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <article className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/95 transition duration-300 hover:-translate-y-1 hover:border-[var(--brand-soft)] hover:shadow-[0_12px_28px_-16px_rgba(58,124,165,0.35)]">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--mint-wash)]">
          {/* Placeholder debajo: si la imagen falla sin disparar onError
              (p. ej. bloqueo ORB), se ve "Sin foto" en lugar de un hueco. */}
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ink-faint)]">
            Sin foto
          </div>
          {img && !imgError && (
            <img
              src={img}
              alt=""
              className="relative h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              onError={() => setImgError(true)}
            />
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
              {rating != null && reviews > 0 && (
                <> · ★ {formatRating(rating)} ({reviews})</>
              )}
            </span>
            {listing.distanceKm != null && (
              <span>· {formatDistance(listing.distanceKm)}</span>
            )}
            {condition && (
              <span className="rounded bg-[var(--mint-wash)] px-1.5 py-0.5 font-semibold text-[var(--brand-deep)]">
                {condition}
              </span>
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

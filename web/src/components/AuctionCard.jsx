import { useRef, useState } from 'react';
import { formatPrice } from '../utils/format.js';
import CountdownTimer from './CountdownTimer.jsx';
import { useToast } from './Toast.jsx';

const FLOW_LABELS = {
  STANDARD: 'Cachivache',
  PREMIUM: 'Bien Raíz',
};

const TYPE_BADGE = {
  CACHIVACHES: 'bg-sky-100 text-sky-800',
  BIENES_RAICES: 'bg-amber-100 text-amber-800',
};

/**
 * Tarjeta de subasta del Home: muestra las fotos del producto en un carrusel
 * (se desliza con el dedo) y, si el vendedor grabó un video, un botón para
 * revisarlo sin salir de la página principal.
 */
export default function AuctionCard({ auction, isOwn, onBid, onOpen }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const touchStartX = useRef(null);

  const photos = auction.photos ?? [];
  const hasVideo = Boolean(auction.videoUrl);
  const endsAt = auction.extended_until ?? auction.ends_at;
  const currentPrice = Number(auction.current_price ?? auction.starting_price);
  const minBid = currentPrice + Number(auction.min_increment ?? 0);

  const goPrev = (e) => {
    e?.stopPropagation?.();
    setActiveIndex((i) => (photos.length > 0 ? (i - 1 + photos.length) % photos.length : 0));
  };

  const goNext = (e) => {
    e?.stopPropagation?.();
    setActiveIndex((i) => (photos.length > 0 ? (i + 1) % photos.length : 0));
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 40) goPrev();
    else if (dx < -40) goNext();
    touchStartX.current = null;
  };

  const openVideo = (e) => {
    e.stopPropagation();
    setShowVideo(true);
  };

  const handleBid = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < minBid) {
      setFeedback(`Puja mínima: ${formatPrice(minBid)}`);
      return;
    }
    setBusy(true);
    setFeedback('');
    try {
      await onBid(auction.id, value);
      setAmount('');
      toast.success('Puja enviada ✓');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      onClick={() => onOpen?.(auction.id)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className="relative aspect-[4/3] select-none bg-slate-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {photos.length > 0 ? (
          <>
            <div
              className="flex h-full w-full transition-transform duration-200"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {photos.map((photo, i) => (
                <img
                  key={`${photo}-${i}`}
                  src={photo}
                  alt={auction.title}
                  className="h-full w-full shrink-0 object-cover"
                  loading="lazy"
                  draggable="false"
                />
              ))}
            </div>

            {photos.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/50 text-white transition hover:bg-slate-900/70"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M12.7 4.3a1 1 0 0 1 0 1.4L8.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
                  </svg>
                </button>
                <button
                  onClick={goNext}
                  aria-label="Foto siguiente"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/50 text-white transition hover:bg-slate-900/70"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7.3 4.3a1 1 0 0 0 0 1.4L11.6 10l-4.3 4.3a1 1 0 0 0 1.4 1.4l5-5a1 1 0 0 0 0-1.4l-5-5a1 1 0 0 0-1.4 0Z" />
                  </svg>
                </button>

                <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {photos.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeIndex
                          ? 'w-4 bg-white'
                          : 'w-1.5 bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-300">
            Sin foto
          </div>
        )}

        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE[auction.category_type]}`}
        >
          {FLOW_LABELS[auction.flow]}
        </span>

        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          EN VIVO
        </span>

        {hasVideo && (
          <button
            onClick={openVideo}
            className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-slate-900"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.3 2.84A1 1 0 0 0 4.73 3.72v12.56a1 1 0 0 0 1.57.88l10-6.28a1 1 0 0 0 0-1.66l-10-6.38Z" />
            </svg>
            Ver video
          </button>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {auction.category ?? auction.product_condition}
          </p>
          <h3 className="mt-0.5 line-clamp-2 font-semibold text-slate-900">
            {auction.title}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Vendido por {auction.seller_name}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">Puja actual</p>
            <p className="text-xl font-bold text-slate-900">
              {formatPrice(currentPrice)}
            </p>
          </div>
          <CountdownTimer endsAt={endsAt} />
        </div>

        <div className="border-t border-slate-100 pt-3">
          {isOwn ? (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-400">
              Es tu subasta
            </p>
          ) : (
            <div
              className="flex gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="number"
                min={minBid}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setFeedback('');
                }}
                placeholder={formatPrice(minBid)}
                className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Monto de tu puja"
              />
              <button
                onClick={handleBid}
                disabled={busy}
                className="shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {busy ? '…' : 'Pujar'}
              </button>
            </div>
          )}
          {feedback && (
            <p className="mt-1.5 text-xs font-medium text-slate-500">{feedback}</p>
          )}
        </div>
      </div>

      {/* Visor del video del producto, sin salir del Home */}
      {showVideo && hasVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setShowVideo(false);
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-2.5">
              <p className="truncate text-sm font-semibold text-white">
                {auction.title}
              </p>
              <button
                onClick={() => setShowVideo(false)}
                aria-label="Cerrar video"
                className="shrink-0 rounded-full p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
            <video
              src={auction.videoUrl}
              controls
              playsInline
              poster={photos[0] ?? undefined}
              className="aspect-[16/9] w-full"
            />
          </div>
        </div>
      )}
    </article>
  );
}

import { useState } from 'react';
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

export default function AuctionCard({ auction, isOwn, onBid, onOpen }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const photo = auction.photos?.[0];
  const endsAt = auction.extended_until ?? auction.ends_at;
  const currentPrice = Number(auction.current_price ?? auction.starting_price);
  const minBid = currentPrice + Number(auction.min_increment ?? 0);

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
      <div className="relative aspect-[4/3] bg-slate-100">
        {photo ? (
          <img
            src={photo}
            alt={auction.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
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
    </article>
  );
}

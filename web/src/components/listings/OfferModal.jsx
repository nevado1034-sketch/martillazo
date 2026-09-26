import { useEffect, useId, useRef, useState } from 'react';
import { formatPrice } from '../../utils/format.js';

export default function OfferModal({ listing, open, onClose, onSubmit }) {
  const titleId = useId();
  const inputRef = useRef(null);
  const isService = listing?.type === 'servicio';
  const listed = listing
    ? formatPrice(listing.price, {
        mode: isService ? listing.priceMode : undefined,
        currency: listing.currency,
      })
    : '';

  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !listing) return;
    setAmount(String(Math.max(1, Math.floor(listing.price * 0.9))));
    setMessage('');
    setName('');
    setError('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open, listing]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !listing) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError('Indica un importe válido.');
      return;
    }
    onSubmit({ amount: n, message, buyerName: name });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/40 animate-fade-in"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-2xl border border-[var(--line)] bg-white p-5 shadow-2xl animate-modal-up sm:rounded-2xl"
      >
        <h2 id={titleId} className="font-display text-xl font-bold text-[var(--ink)]">
          Proponer precio
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Precio publicado: <strong className="text-[var(--ink)]">{listed}</strong>
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label htmlFor="offer-amount" className="mb-1 block text-sm font-medium">
              Tu oferta (S/)
            </label>
            <input
              ref={inputRef}
              id="offer-amount"
              type="number"
              min="1"
              step="1"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-base outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--mint-soft)]"
              required
            />
          </div>
          <div>
            <label htmlFor="offer-name" className="mb-1 block text-sm font-medium">
              Tu nombre
            </label>
            <input
              id="offer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Opcional en el MVP"
              className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label htmlFor="offer-msg" className="mb-1 block text-sm font-medium">
              Mensaje
            </label>
            <textarea
              id="offer-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                isService
                  ? 'Cuándo lo necesitas, detalles del trabajo…'
                  : 'Puedo pasar a verlo, forma de pago…'
              }
              className="w-full resize-none rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          {error && <p className="text-sm text-[var(--coral-deep)]">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-[var(--ink-muted)] hover:bg-[var(--surface)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-[var(--coral)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--coral-deep)]"
            >
              Enviar oferta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

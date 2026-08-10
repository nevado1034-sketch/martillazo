import { useRef, useState } from 'react';
import { updateMyAuction } from '../api/auctions.js';
import MediaPicker from './MediaPicker.jsx';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Edición de una publicación del vendedor: título, descripción, precio
 * (solo si aún no hay pujas) y medios (fotos + video con opción de borrado).
 */
export default function EditAuctionModal({ auction, token, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    title: auction.title ?? '',
    description: auction.description ?? '',
    price: auction.current_price ?? auction.starting_price ?? '',
    photos: auction.photos ?? [],
    videoUrl: auction.videoUrl ?? '',
  }));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');

  const pickerOpenedAtRef = useRef(0);

  const canChangePrice = (auction.bid_count ?? 0) === 0;

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (Date.now() - pickerOpenedAtRef.current < 800) return;
    onClose();
  };

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const patch = {
        title: form.title.trim(),
        description: form.description.trim(),
        photos: form.photos.map((p) => p.trim()).filter(Boolean),
        videoUrl: form.videoUrl.trim() || null,
      };
      if (canChangePrice && form.price !== '' && form.price != null) {
        patch.price = Number(form.price);
      }
      const updated = await updateMyAuction({ auctionId: auction.id, token, patch });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Editar publicación</h2>
            <p className="text-sm text-slate-500">
              Mejora la foto o el video y ajusta tu subasta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Título del producto</label>
            <input
              className={inputCls}
              value={form.title}
              onChange={set('title')}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              className={inputCls}
              rows={3}
              value={form.description}
              onChange={set('description')}
              placeholder="Estado, accesorios incluidos, detalles..."
            />
          </div>

          <div>
            <label className={labelCls}>Precio (S/)</label>
            {canChangePrice ? (
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={set('price')}
                placeholder="0.00"
              />
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <span className="font-bold text-slate-900">{form.price}</span>
                  <span className="text-xs font-semibold text-amber-700">
                    🔒 Fijado por pujas
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  La subasta ya tiene pujas: el precio no se puede cambiar.
                </p>
              </>
            )}
          </div>

          {/* Medios: subir/borrar fotos y video */}
          <MediaPicker
            token={token}
            photos={form.photos}
            videoUrl={form.videoUrl}
            onMediaChange={({ photos, videoUrl }) =>
              setForm((prev) => ({ ...prev, photos, videoUrl }))
            }
            pickerOpenedAtRef={pickerOpenedAtRef}
            onUploadingChange={setUploading}
          />

          {uploading && (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
              {uploading}
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || Boolean(uploading)}
            className="w-full rounded-xl bg-brand-600 px-4 py-3 font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { createAuction, fetchCategories } from '../api/auctions.js';
import MediaPicker from './MediaPicker.jsx';

const CONDITIONS = [
  { value: 'NEW', label: 'Nuevo' },
  { value: 'LIKE_NEW', label: 'Como nuevo' },
  { value: 'USED', label: 'Usado' },
  { value: 'REFURBISHED', label: 'Reacondicionado' },
  { value: 'DEFECTIVE', label: 'Con defecto' },
];

const DURATIONS = [
  { value: 6, label: '6 horas' },
  { value: 12, label: '12 horas' },
  { value: 24, label: '1 día' },
  { value: 48, label: '2 días' },
  { value: 72, label: '3 días' },
];

const DEFAULT_FORM = {
  title: '',
  description: '',
  categoryId: '',
  condition: 'USED',
  startingPrice: '',
  minIncrement: '',
  durationHours: 24,
  flow: 'STANDARD',
  photos: [],
  videoUrl: '',
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';
const labelCls = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Modal "Dar un Martillazo": alta de un producto + subasta.
 *
 * Incluye captura directa de fotos y video desde el celular (o galería) con
 * subida inmediata, una galería interna para revisarlas y borrar las que no
 * gusten, y guardado del borrador para que abrir la cámara no pierda lo hecho.
 */
export default function CreateAuctionModal({
  open,
  onClose,
  onCreated,
  token,
  initialDraft,
  onDraftChange,
}) {
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(() => ({
    ...DEFAULT_FORM,
    ...(initialDraft?.form ?? {}),
  }));
  const [urlPhoto, setUrlPhoto] = useState(initialDraft?.urlPhoto ?? '');
  const [urlVideo, setUrlVideo] = useState(initialDraft?.urlVideo ?? '');
  const [uploading, setUploading] = useState('');

  // Marca de tiempo de la última apertura del selector de archivos: evita que
  // el navegador del celular cierre el modal con un click fantasma al volver
  // de la cámara/galería.
  const pickerOpenedAtRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [open]);

  // Guarda el borrador mientras se edita, para sobrevivir recargas del celular.
  useEffect(() => {
    if (!open) return;
    onDraftChange?.({ form, urlPhoto, urlVideo });
  }, [open, form, urlPhoto, urlVideo, onDraftChange]);

  if (!open) return null;

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleBackdropClick = (e) => {
    if (e.target !== e.currentTarget) return;
    if (Date.now() - pickerOpenedAtRef.current < 800) return;
    onClose();
  };

  const resetForm = () => {
    setForm({ ...DEFAULT_FORM });
    setUrlPhoto('');
    setUrlVideo('');
    setError('');
    setUploading('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await createAuction({
        token,
        auction: {
          ...form,
          startingPrice: Number(form.startingPrice),
          minIncrement: Number(form.minIncrement),
          durationHours: Number(form.durationHours),
          photos: form.photos.map((p) => p.trim()).filter(Boolean),
          videoUrl: form.videoUrl.trim() || undefined,
        },
      });
      onCreated(created);
      onClose();
      resetForm();
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
            <h2 className="text-xl font-extrabold text-slate-900">
              Dar un Martillazo
            </h2>
            <p className="text-sm text-slate-500">
              Publica tu producto y ponlo a subasta.
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
              placeholder='Ej: Smart TV 50" LED 4K'
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Categoría</label>
              <select
                className={inputCls}
                value={form.categoryId}
                onChange={set('categoryId')}
                required
              >
                <option value="">Selecciona…</option>
                {['CACHIVACHES', 'BIENES_RAICES'].map((type) => (
                  <optgroup
                    key={type}
                    label={type === 'BIENES_RAICES' ? 'Bienes Raíces' : 'Cachivaches'}
                  >
                    {categories
                      .filter((c) => c.type === type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Condición</label>
              <select className={inputCls} value={form.condition} onChange={set('condition')}>
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Flujo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, flow: 'STANDARD' }))}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  form.flow === 'STANDARD'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-500 hover:border-slate-400'
                }`}
              >
                Cachivache
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, flow: 'PREMIUM' }))}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                  form.flow === 'PREMIUM'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-300 text-slate-500 hover:border-slate-400'
                }`}
              >
                Bien Raíz
              </button>
            </div>
            {form.flow === 'PREMIUM' && (
              <p className="mt-1.5 text-xs text-slate-500">
                Incluye cuenta de custodia (escrow) y cierre notarial a 15 días.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Precio inicial (S/)</label>
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={form.startingPrice}
                onChange={set('startingPrice')}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Incremento (S/)</label>
              <input
                className={inputCls}
                type="number"
                min="0.01"
                step="0.01"
                value={form.minIncrement}
                onChange={set('minIncrement')}
                placeholder="1.00"
                required
              />
            </div>
            <div>
              <label className={labelCls}>Duración</label>
              <select
                className={inputCls}
                value={form.durationHours}
                onChange={set('durationHours')}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Media del producto: fotos + video corto */}
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
            {busy ? 'Publicando…' : 'Publicar y empezar la subasta'}
          </button>
        </form>
      </div>
    </div>
  );
}

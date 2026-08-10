import { useEffect, useRef, useState } from 'react';
import { createAuction, fetchCategories } from '../api/auctions.js';
import { uploadPhoto, uploadVideo } from '../api/uploads.js';

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

const MAX_IMAGE_DIM = 1280;
const MAX_VIDEO_MB = 90;

/** Carga una foto como <img> (compatible con todos los móviles). */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/** Redimensiona una foto del celular a JPEG (más liviano para subir). */
async function resizeToJpeg(file, maxDim = MAX_IMAGE_DIM, quality = 0.82) {
  const { img, url } = await loadImageFromFile(file);
  try {
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

  const photoCamRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

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

  const openPicker = (ref) => {
    pickerOpenedAtRef.current = Date.now();
    ref.current?.click();
  };

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

  const handlePhotoFiles = async (fileList) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setUploading(`Subiendo foto ${i + 1}/${files.length}…`);
        const compressed = await resizeToJpeg(file);
        const { url } = await uploadPhoto({ token, file: compressed });
        setForm((prev) => ({ ...prev, photos: [...prev.photos, url] }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
    }
  };

  const handleVideoFile = async (file) => {
    const video = file ?? videoRef.current?.files?.[0];
    if (!video || !video.type.startsWith('video/')) return;
    if (video.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`El video supera los ${MAX_VIDEO_MB} MB. Graba un video más corto.`);
      return;
    }
    setUploading('Subiendo video…');
    try {
      const { url } = await uploadVideo({ token, file: video });
      setForm((prev) => ({ ...prev, videoUrl: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading('');
    }
  };

  const removePhoto = (index) =>
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));

  const addUrlPhoto = () => {
    const url = urlPhoto.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, photos: [...prev.photos, url] }));
    setUrlPhoto('');
  };

  const addUrlVideo = () => {
    const url = urlVideo.trim();
    if (!url) return;
    setForm((prev) => ({ ...prev, videoUrl: url }));
    setUrlVideo('');
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
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className={labelCls}>Fotos del producto</label>
            <p className="mb-2 text-xs text-slate-500">
              Tómalas con tu cámara o elige de la galería. La primera foto es
              la portada.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openPicker(photoCamRef)}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15.75 6.75 16.5 5h-9l.75 1.75M5 8.5h14a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="13.5" r="3.25" />
                </svg>
                Tomar foto
              </button>
              <button
                type="button"
                onClick={() => openPicker(galleryRef)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="9" cy="9" r="1.75" />
                  <path d="m4 17 4.5-4.5 3.5 3.5 3-3L19 17" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Galería
              </button>
            </div>

            <input
              ref={photoCamRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handlePhotoFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handlePhotoFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <div className="mt-2 flex gap-2">
              <input
                className={inputCls}
                value={urlPhoto}
                onChange={(e) => setUrlPhoto(e.target.value)}
                placeholder="O pega una URL de foto"
              />
              <button
                type="button"
                onClick={addUrlPhoto}
                className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Agregar
              </button>
            </div>

            {/* Galería interna: revisa y borra lo que no te guste */}
            {form.photos.length > 0 && (
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Galería · {form.photos.length} {form.photos.length === 1 ? 'foto' : 'fotos'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, photos: [] }))}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Borrar todas
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {form.photos.map((photo, i) => (
                    <div
                      key={`${photo}-${i}`}
                      className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                    >
                      <img src={photo} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-slate-900/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          Portada
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label={`Borrar foto ${i + 1}`}
                        title="Borrar foto"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-red-600"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className={`${labelCls} mt-4`}>Video corto (opcional)</label>
            <button
              type="button"
              onClick={() => openPicker(videoRef)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2.5" y="6" width="13" height="12" rx="2" />
                <path d="m21.5 9.5-5 2.5 5 2.5v-5Z" strokeLinejoin="round" />
              </svg>
              {form.videoUrl ? 'Grabar otro video' : 'Grabar o elegir video'}
            </button>
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                handleVideoFile(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            {form.videoUrl && (
              <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <video
                  src={form.videoUrl}
                  controls
                  className="max-h-48 w-full rounded-lg bg-black"
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-600">
                    Video del producto listo ✓
                  </p>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, videoUrl: '' }))}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Borrar video
                  </button>
                </div>
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <input
                className={inputCls}
                value={urlVideo}
                onChange={(e) => setUrlVideo(e.target.value)}
                placeholder="O pega una URL de video"
              />
              <button
                type="button"
                onClick={addUrlVideo}
                className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Agregar
              </button>
            </div>
          </div>

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

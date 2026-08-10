import { useRef, useState } from 'react';
import { uploadPhoto, uploadVideo } from '../api/uploads.js';

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
 * Galería de medios del producto: captura de fotos/video desde el celular (o
 * galería), subida inmediata con progreso, galería interna para revisar y
 * borrar lo que no guste, y opción de pegar URLs.
 *
 * Es un componente controlado: `photos` y `videoUrl` vienen del padre y se
 * notifican los cambios con `onMediaChange({ photos, videoUrl })`.
 *
 * @param {MutableRefObject<number>} pickerOpenedAtRef ref compartida con el
 *        modal padre para ignorar el click fantasma del celular al volver de
 *        la cámara (evita que el modal se cierre).
 */
export default function MediaPicker({
  token,
  photos,
  videoUrl,
  onMediaChange,
  pickerOpenedAtRef,
  onUploadingChange,
}) {
  const [uploading, setUploading] = useState('');
  const [error, setError] = useState('');
  const [urlPhoto, setUrlPhoto] = useState('');
  const [urlVideo, setUrlVideo] = useState('');

  const photoCamRef = useRef(null);
  const galleryRef = useRef(null);
  const videoRef = useRef(null);

  const setBusy = (value) => {
    setUploading(value);
    onUploadingChange?.(Boolean(value));
  };

  const openPicker = (ref) => {
    if (pickerOpenedAtRef) pickerOpenedAtRef.current = Date.now();
    ref.current?.click();
  };

  const handlePhotoFiles = async (fileList) => {
    const files = Array.from(fileList ?? []).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return;
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setBusy(`Subiendo foto ${i + 1}/${files.length}…`);
        const compressed = await resizeToJpeg(file);
        const { url } = await uploadPhoto({ token, file: compressed });
        onMediaChange({ photos: [...photos, url], videoUrl });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const handleVideoFile = async (file) => {
    const video = file ?? videoRef.current?.files?.[0];
    if (!video || !video.type.startsWith('video/')) return;
    if (video.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`El video supera los ${MAX_VIDEO_MB} MB. Graba un video más corto.`);
      return;
    }
    setBusy('Subiendo video…');
    try {
      const { url } = await uploadVideo({ token, file: video });
      onMediaChange({ photos, videoUrl: url });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  };

  const removePhoto = (index) =>
    onMediaChange({ photos: photos.filter((_, i) => i !== index), videoUrl });

  const addUrlPhoto = () => {
    const url = urlPhoto.trim();
    if (!url) return;
    onMediaChange({ photos: [...photos, url], videoUrl });
    setUrlPhoto('');
  };

  const addUrlVideo = () => {
    const url = urlVideo.trim();
    if (!url) return;
    onMediaChange({ photos, videoUrl: url });
    setUrlVideo('');
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <label className={labelCls}>Fotos del producto</label>
      <p className="mb-2 text-xs text-slate-500">
        Tómalas con tu cámara o elige de la galería. La primera foto es la
        portada.
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
      {photos.length > 0 && (
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Galería · {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </p>
            <button
              type="button"
              onClick={() => onMediaChange({ photos: [], videoUrl })}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Borrar todas
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((photo, i) => (
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
        {videoUrl ? 'Grabar otro video' : 'Grabar o elegir video'}
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

      {videoUrl && (
        <div className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <video src={videoUrl} controls className="max-h-48 w-full rounded-lg bg-black" />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs font-semibold text-emerald-600">
              Video del producto listo ✓
            </p>
            <button
              type="button"
              onClick={() => onMediaChange({ photos, videoUrl: '' })}
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

      {uploading && (
        <p className="mt-3 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700">
          {uploading}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

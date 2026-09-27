import { useEffect, useState } from 'react';

const CAMERA_ID = 'pulgasya-photo-camera';
const GALLERY_ID = 'pulgasya-photo-gallery';

/**
 * Cámara y galería = inputs TOTALMENTE separados.
 * En iOS/Android, <label htmlFor> abre mejor la cámara que input.click().
 * - Tomar foto → capture="environment"
 * - Galería → sin capture
 */
export default function PhotoPicker({ file, previewUrl, error, onPick, onClear }) {
  // Remount del input cámara tras cada uso para que capture no “se pegue”
  const [cameraKey, setCameraKey] = useState(0);
  const [galleryKey, setGalleryKey] = useState(0);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (next, e) => {
    if (e?.target) e.target.value = '';
    if (!next) return;
    // Algunos móviles no rellenan type (p.ej. HEIC); aceptar si hay archivo
    if (next.type && !next.type.startsWith('image/') && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(next.name || '')) {
      onPick(null, 'El archivo debe ser una imagen (JPG, PNG, WEBP…).');
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      onPick(null, 'La foto supera 15 MB. Elige otra más ligera.');
      return;
    }
    onPick(next, null);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Label nativo → input cámara (no button + .click()) */}
        <label
          htmlFor={CAMERA_ID}
          className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--primary-celeste)] bg-[var(--mint-wash)] px-4 py-3 text-center text-sm font-semibold text-[var(--primary-celeste)] active:bg-[var(--mint-soft)]"
        >
          Tomar foto
        </label>
        <label
          htmlFor={GALLERY_ID}
          className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--text-dark)] active:bg-[var(--bg-light)]"
        >
          Elegir de galería
        </label>
      </div>

      {/* Input cámara: SIEMPRE con capture; nunca reutilizar el de galería */}
      <input
        key={`camera-${cameraKey}`}
        id={CAMERA_ID}
        name="pulgasya_camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        onChange={(e) => {
          handleFile(e.target.files?.[0], e);
          setCameraKey((k) => k + 1);
        }}
      />

      {/* Input galería: SIN capture ni webkitdirectory */}
      <input
        key={`gallery-${galleryKey}`}
        id={GALLERY_ID}
        name="pulgasya_gallery"
        type="file"
        accept="image/*"
        className="pointer-events-none absolute h-px w-px opacity-0"
        tabIndex={-1}
        onChange={(e) => {
          handleFile(e.target.files?.[0], e);
          setGalleryKey((k) => k + 1);
        }}
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--mint-wash)]">
          <img
            src={previewUrl}
            alt="Vista previa"
            className="max-h-64 w-full object-cover sm:max-h-72"
          />
          <div className="flex items-center justify-between gap-2 border-t border-[var(--line)] bg-white px-3 py-2">
            <p className="truncate text-xs text-[var(--ink-muted)]">
              {file?.name || 'Foto seleccionada'}
              {file?.size ? ` · ${(file.size / 1024).toFixed(0)} KB` : ''}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              className="shrink-0 text-xs font-semibold text-[var(--cta-orange)]"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-faint)]">
          En el celular, «Tomar foto» abre la cámara; «Elegir de galería» abre tus fotos.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-[var(--coral-wash)] px-3 py-2 text-sm text-[var(--coral-deep)]">
          {error}
        </p>
      )}
    </div>
  );
}

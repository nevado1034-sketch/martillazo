import { useEffect, useState } from 'react';
import WebcamCaptureModal from './WebcamCaptureModal.jsx';

const CAMERA_ID = 'pulgasya-photo-camera';
const GALLERY_ID = 'pulgasya-photo-gallery';

/** Móvil / touch: pointer coarse o viewport estrecho. */
function useIsMobileCamera() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return true;
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(max-width: 767px)').matches
    );
  });

  useEffect(() => {
    const coarse = window.matchMedia('(pointer: coarse)');
    const narrow = window.matchMedia('(max-width: 767px)');
    const sync = () => setMobile(coarse.matches || narrow.matches);
    sync();
    coarse.addEventListener('change', sync);
    narrow.addEventListener('change', sync);
    return () => {
      coarse.removeEventListener('change', sync);
      narrow.removeEventListener('change', sync);
    };
  }, []);

  return mobile;
}

/**
 * - Móvil: label + input capture="environment" / galería sin capture
 * - Escritorio: Tomar foto → getUserMedia modal + Capturar
 */
export default function PhotoPicker({ file, previewUrl, error, onPick, onClear }) {
  const isMobile = useIsMobileCamera();
  const [cameraKey, setCameraKey] = useState(0);
  const [galleryKey, setGalleryKey] = useState(0);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [camHint, setCamHint] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (next, e) => {
    if (e?.target) e.target.value = '';
    if (!next) return;
    if (
      next.type &&
      !next.type.startsWith('image/') &&
      !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(next.name || '')
    ) {
      onPick(null, 'El archivo debe ser una imagen (JPG, PNG, WEBP…).');
      return;
    }
    if (next.size > 15 * 1024 * 1024) {
      onPick(null, 'La foto supera 15 MB. Elige otra más ligera.');
      return;
    }
    setCamHint('');
    onPick(next, null);
  };

  const openDesktopCamera = (e) => {
    e.preventDefault();
    setCamHint('');
    setWebcamOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {isMobile ? (
          <label
            htmlFor={CAMERA_ID}
            className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--primary-celeste)] bg-[var(--mint-wash)] px-4 py-3 text-center text-sm font-semibold text-[var(--primary-celeste)] active:bg-[var(--mint-soft)]"
          >
            Tomar foto
          </label>
        ) : (
          <button
            type="button"
            onClick={openDesktopCamera}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--primary-celeste)] bg-[var(--mint-wash)] px-4 py-3 text-center text-sm font-semibold text-[var(--primary-celeste)] hover:bg-[var(--mint-soft)]"
          >
            Tomar foto
          </button>
        )}
        <label
          htmlFor={GALLERY_ID}
          className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-center text-sm font-semibold text-[var(--text-dark)] active:bg-[var(--bg-light)]"
        >
          Elegir de galería
        </label>
      </div>

      {/* Solo móvil: input con capture */}
      {isMobile && (
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
      )}

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
          {isMobile
            ? 'En el celular, «Tomar foto» abre la cámara; «Elegir de galería» abre tus fotos.'
            : 'En el PC, «Tomar foto» usa la webcam; «Elegir de galería» abre un archivo.'}
        </p>
      )}

      {(error || camHint) && (
        <p className="rounded-lg bg-[var(--coral-wash)] px-3 py-2 text-sm text-[var(--coral-deep)]">
          {error || camHint}
        </p>
      )}

      {!isMobile && (
        <WebcamCaptureModal
          open={webcamOpen}
          onClose={() => setWebcamOpen(false)}
          onCapture={(f) => handleFile(f)}
          onError={(msg) => setCamHint(msg)}
        />
      )}
    </div>
  );
}

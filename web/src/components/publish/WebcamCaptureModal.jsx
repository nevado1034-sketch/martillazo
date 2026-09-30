import { useEffect, useId, useRef, useState } from 'react';

/**
 * Modal de webcam para escritorio (getUserMedia).
 * Detiene el MediaStream al cerrar o tras capturar.
 */
export default function WebcamCaptureModal({ open, onClose, onCapture, onError }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const titleId = useId();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState('');

  const stopStream = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setReady(false);
  };

  useEffect(() => {
    if (!open) {
      stopStream();
      setLocalError('');
      return undefined;
    }

    let cancelled = false;
    setReady(false);
    setLocalError('');

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        const msg =
          'La cámara del PC requiere HTTPS. Usa el enlace del preview o https://localhost.';
        setLocalError(msg);
        onError?.(msg);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        const denied =
          err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
        const missing =
          err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
        const msg = denied
          ? 'No diste permiso a la cámara. Puedes elegir una foto de tu equipo.'
          : missing
            ? 'No se encontró una cámara en este equipo. Elige una foto del disco.'
            : 'No se pudo abrir la cámara. Elige una foto de tu equipo.';
        setLocalError(msg);
        onError?.(msg);
      }
    }

    start();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        stopStream();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !ready) return;
    setBusy(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('No se pudo capturar'))),
          'image/jpeg',
          0.92,
        );
      });
      const file = new File([blob], `webcam-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      stopStream();
      onCapture(file);
      onClose();
    } catch {
      setLocalError('No se pudo capturar la imagen. Intenta de nuevo o elige un archivo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--text-dark)]/50 animate-fade-in"
        aria-label="Cerrar cámara"
        onClick={() => {
          stopStream();
          onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-lg overflow-hidden rounded-t-2xl border border-[var(--line)] bg-white shadow-2xl animate-modal-up sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
          <h2 id={titleId} className="font-display text-lg font-bold text-[var(--text-dark)]">
            Cámara web
          </h2>
          <button
            type="button"
            className="text-sm font-semibold text-[var(--ink-muted)] hover:text-[var(--text-dark)]"
            onClick={() => {
              stopStream();
              onClose();
            }}
          >
            Cerrar
          </button>
        </div>

        <div className="bg-[var(--text-dark)]">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-video w-full object-cover"
          />
        </div>

        {(localError || !ready) && (
          <p className="px-4 pt-3 text-sm text-[var(--ink-muted)]">
            {localError || 'Abriendo cámara…'}
          </p>
        )}

        <div className="flex flex-col gap-2 p-4 sm:flex-row">
          <button
            type="button"
            disabled={!ready || busy}
            onClick={capture}
            className="flex-1 rounded-xl bg-[var(--cta-orange)] px-4 py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            {busy ? 'Capturando…' : 'Capturar'}
          </button>
          <button
            type="button"
            onClick={() => {
              stopStream();
              onClose();
              // Disparar fallback a archivo
              document.getElementById('pulgasya-photo-gallery')?.click();
            }}
            className="flex-1 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--text-dark)] hover:bg-[var(--bg-light)]"
          >
            Elegir archivo
          </button>
        </div>
      </div>
    </div>
  );
}

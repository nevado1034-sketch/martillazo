import { useEffect, useId, useRef, useState } from 'react';

/**
 * Selector de foto móvil: cámara y galería por separado.
 * - Galería: accept=image/* sin capture
 * - Cámara: accept=image/* + capture=environment
 */
export default function PhotoPicker({ file, previewUrl, error, onPick, onClear }) {
  const galleryId = useId();
  const cameraId = useId();
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleChange = (e) => {
    const next = e.target.files?.[0];
    // permitir volver a elegir el mismo archivo
    e.target.value = '';
    if (!next) return;
    if (!next.type.startsWith('image/')) {
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
      <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--primary-celeste)] bg-[var(--mint-wash)] px-4 py-3 text-sm font-semibold text-[var(--primary-celeste)] active:bg-[var(--mint-soft)]"
        >
          Tomar foto
        </button>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-dark)] active:bg-[var(--bg-light)]"
        >
          Elegir de galería
        </button>
      </div>

      <input
        ref={cameraRef}
        id={cameraId}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        id={galleryId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
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
              onClick={onClear}
              className="shrink-0 text-xs font-semibold text-[var(--cta-orange)]"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[var(--ink-faint)]">
          Opcional. En el celular puedes usar la cámara o la galería.
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

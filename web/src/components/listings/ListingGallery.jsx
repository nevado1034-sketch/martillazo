import { useCallback, useEffect, useRef, useState } from 'react';
import './ListingGallery.css';

/**
 * Galería estilo Mercado Libre: thumbs a la izquierda, visor principal,
 * zoom al hover (~2x siguiendo el cursor), click abre modal fullscreen.
 */
export default function ListingGallery({ images = [], alt = 'Foto del anuncio' }) {
  const urls = (Array.isArray(images) ? images : []).filter(Boolean);
  const [active, setActive] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [zoom, setZoom] = useState({ scale: 1, origin: '50% 50%' });
  const containerRef = useRef(null);

  const urlsKey = urls.join('|');
  useEffect(() => {
    setActive(0);
    setZoom({ scale: 1, origin: '50% 50%' });
  }, [urlsKey]);

  useEffect(() => {
    if (!modalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
      if (e.key === 'ArrowRight') {
        setActive((i) => (urls.length ? (i + 1) % urls.length : 0));
      }
      if (e.key === 'ArrowLeft') {
        setActive((i) =>
          urls.length ? (i - 1 + urls.length) % urls.length : 0,
        );
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [modalOpen, urls.length]);

  const current = urls[active] || null;

  const onMove = useCallback((e) => {
    const el = containerRef.current;
    if (!el || !current) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({
      scale: 2,
      origin: `${Math.min(100, Math.max(0, x))}% ${Math.min(100, Math.max(0, y))}%`,
    });
  }, [current]);

  const onLeave = useCallback(() => {
    setZoom({ scale: 1, origin: '50% 50%' });
  }, []);

  if (!urls.length) {
    return (
      <div className="galeria-empty" role="img" aria-label="Sin imagen">
        Sin imagen
      </div>
    );
  }

  return (
    <>
      <div className="galeria-container">
        <div className="thumbnails" role="tablist" aria-label="Miniaturas">
          {urls.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`thumb-btn${i === active ? ' active' : ''}`}
              onClick={() => {
                setActive(i);
                setZoom({ scale: 1, origin: '50% 50%' });
              }}
              onMouseEnter={() => {
                // Preview on hover like ML (desktop)
                if (window.matchMedia('(hover: hover)').matches) {
                  setActive(i);
                  setZoom({ scale: 1, origin: '50% 50%' });
                }
              }}
            >
              <img src={src} alt="" className="thumb" />
            </button>
          ))}
        </div>

        <div
          ref={containerRef}
          className="main-image-container"
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Ampliar imagen"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setModalOpen(true);
            }
          }}
        >
          <img
            src={current}
            alt={alt}
            style={{
              transform: `scale(${zoom.scale})`,
              transformOrigin: zoom.origin,
            }}
          />
        </div>
      </div>

      <div
        id="modalZoom"
        className={`galeria-modal${modalOpen ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Imagen ampliada"
        onClick={() => setModalOpen(false)}
      >
        <button
          type="button"
          className="galeria-close"
          aria-label="Cerrar"
          onClick={(e) => {
            e.stopPropagation();
            setModalOpen(false);
          }}
        >
          ×
        </button>
        {urls.length > 1 && (
          <>
            <button
              type="button"
              className="galeria-nav galeria-nav-prev"
              aria-label="Anterior"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => (i - 1 + urls.length) % urls.length);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="galeria-nav galeria-nav-next"
              aria-label="Siguiente"
              onClick={(e) => {
                e.stopPropagation();
                setActive((i) => (i + 1) % urls.length);
              }}
            >
              ›
            </button>
          </>
        )}
        <img
          className="modal-content"
          src={current}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
        />
        {urls.length > 1 && (
          <p className="galeria-modal-count">
            {active + 1} / {urls.length}
          </p>
        )}
      </div>
    </>
  );
}

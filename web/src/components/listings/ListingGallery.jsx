import { useEffect, useState } from 'react';
import './ListingGallery.css';

/**
 * Galería estilo Mercado Libre: thumbs a la izquierda y visor principal.
 * Click abre la imagen en grande (modal). Sin zoom al pasar el mouse:
 * en PC el zoom 2x agrandaba/cortaba la portada y se veía estirada.
 */
export default function ListingGallery({ images = [], alt = 'Foto del anuncio' }) {
  const urls = (Array.isArray(images) ? images : []).filter(Boolean);
  const [active, setActive] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [broken, setBroken] = useState(false);

  const urlsKey = urls.join('|');
  useEffect(() => {
    setActive(0);
    setBroken(false);
  }, [urlsKey]);

  useEffect(() => {
    setBroken(false);
  }, [active]);

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
              onClick={() => setActive(i)}
              onMouseEnter={() => {
                // Preview on hover like ML (desktop)
                if (window.matchMedia('(hover: hover)').matches) {
                  setActive(i);
                }
              }}
            >
              <img
                src={src}
                alt=""
                className="thumb"
                onError={(e) => {
                  e.currentTarget.style.visibility = 'hidden';
                }}
              />
            </button>
          ))}
        </div>

        <div
          className="main-image-container"
          onClick={() => setModalOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Ampliar imagen"
          title="Click para ampliar"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setModalOpen(true);
            }
          }}
        >
          {broken ? (
            <div className="galeria-empty">Imagen no disponible</div>
          ) : (
            <img
              src={current}
              alt={alt}
              onError={() => setBroken(true)}
            />
          )}
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
        {broken ? (
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            Imagen no disponible
          </div>
        ) : (
          <img
            className="modal-content"
            src={current}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            onError={() => setBroken(true)}
          />
        )}
        {urls.length > 1 && (
          <p className="galeria-modal-count">
            {active + 1} / {urls.length}
          </p>
        )}
      </div>
    </>
  );
}

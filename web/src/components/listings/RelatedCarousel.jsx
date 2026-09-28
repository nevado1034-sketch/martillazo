import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format.js';
import './RelatedCarousel.css';

const SCROLL_BY = 480;

/**
 * Carrusel «Productos relacionados» / «También te puede interesar».
 * moverCarrusel(±1) → scrollBy ~480px (≈2 cards).
 */
export default function RelatedCarousel({
  title = 'También te puede interesar',
  listings = [],
  loading = false,
}) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const syncNav = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    syncNav();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', syncNav, { passive: true });
    window.addEventListener('resize', syncNav);
    return () => {
      el.removeEventListener('scroll', syncNav);
      window.removeEventListener('resize', syncNav);
    };
  }, [listings.length]);

  const moverCarrusel = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * SCROLL_BY, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <section className="relacionados-section" aria-busy="true">
        <h2 className="relacionados-title">{title}</h2>
        <p className="relacionados-empty">Cargando sugerencias…</p>
      </section>
    );
  }

  if (!listings?.length) return null;

  return (
    <section className="relacionados-section" aria-label={title}>
      <div className="relacionados-header">
        <h2 className="relacionados-title">{title}</h2>
        <div className="relacionados-nav">
          <button
            type="button"
            className="relacionados-btn"
            aria-label="Anterior"
            disabled={!canPrev}
            onClick={() => moverCarrusel(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="relacionados-btn"
            aria-label="Siguiente"
            disabled={!canNext}
            onClick={() => moverCarrusel(1)}
          >
            ›
          </button>
        </div>
      </div>
      <div className="relacionados-track-wrap">
        <div className="relacionados-track" ref={trackRef}>
          {listings.map((listing) => {
            const img = listing.images?.[0];
            const isService = listing.type === 'servicio';
            return (
              <Link
                key={listing.id}
                to={`/anuncio/${listing.id}`}
                className="relacionados-card"
              >
                <div className="relacionados-card-img">
                  {img ? (
                    <img src={img} alt="" loading="lazy" />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        height: '100%',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--ink-faint)',
                        fontSize: '0.8rem',
                      }}
                    >
                      Sin foto
                    </div>
                  )}
                </div>
                <div className="relacionados-card-body">
                  <p className="relacionados-card-price">
                    {formatPrice(listing.price, {
                      mode: isService ? listing.priceMode : undefined,
                      currency: listing.currency,
                    })}
                  </p>
                  <h3 className="relacionados-card-title">{listing.title}</h3>
                  {listing.location && (
                    <p className="relacionados-card-meta">{listing.location}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

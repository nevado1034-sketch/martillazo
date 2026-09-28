import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_BANNERS } from '../../data/homeBanners.js';
import './HomeBannerSlider.css';

const AUTOPLAY_MS = 4500;

/**
 * Banner / home slider estilo Mercado Libre:
 * full-bleed bajo el header, autoplay, pause on hover, flechas, dots, swipe.
 * Loop infinito: clones en extremos + salto silencioso (sin rewind animado).
 */
export default function HomeBannerSlider({ slides = HOME_BANNERS }) {
  const items = slides?.length ? slides : HOME_BANNERS;
  const n = items.length;
  const loop = n > 1;

  // Track: [cloneLast, ...items, cloneFirst] → índice real 1..n
  const trackItems = useMemo(() => {
    if (!n) return [];
    if (!loop) return items.map((s, i) => ({ ...s, _key: `solo-${s.id || i}` }));
    return [
      { ...items[n - 1], _key: `clone-last-${items[n - 1].id || n - 1}`, _clone: true },
      ...items.map((s, i) => ({ ...s, _key: `real-${s.id || i}` })),
      { ...items[0], _key: `clone-first-${items[0].id || 0}`, _clone: true },
    ];
  }, [items, n, loop]);

  const [index, setIndex] = useState(loop ? 1 : 0);
  const [noTransition, setNoTransition] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef(null);
  const jumping = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Tras salto silencioso, reactivar transición en el siguiente frame
  useEffect(() => {
    if (!noTransition) return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setNoTransition(false);
        jumping.current = false;
      });
    });
    return () => cancelAnimationFrame(id);
  }, [noTransition, index]);

  const logicalIndex = loop ? Math.min(Math.max(index - 1, 0), n - 1) : index;

  const go = useCallback(
    (next) => {
      if (!n || jumping.current) return;
      if (!loop) {
        setIndex(Math.min(Math.max(next, 0), n - 1));
        return;
      }
      setIndex(next);
    },
    [n, loop],
  );

  const next = useCallback(() => {
    if (!loop) return;
    go(index + 1);
  }, [go, index, loop]);

  const prev = useCallback(() => {
    if (!loop) return;
    go(index - 1);
  }, [go, index, loop]);

  const goToLogical = useCallback(
    (logical) => {
      if (!n) return;
      go(loop ? logical + 1 : logical);
    },
    [go, loop, n],
  );

  useEffect(() => {
    if (paused || reducedMotion || !loop) return undefined;
    const t = setInterval(() => {
      if (jumping.current) return;
      setIndex((i) => i + 1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reducedMotion, loop]);

  const onTransitionEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (!loop || jumping.current) return;
    // Llegamos al clone del primero (después del último real)
    if (index === n + 1) {
      jumping.current = true;
      setNoTransition(true);
      setIndex(1);
      return;
    }
    // Llegamos al clone del último (antes del primero real)
    if (index === 0) {
      jumping.current = true;
      setNoTransition(true);
      setIndex(n);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) next();
    else prev();
  };

  if (!items.length) return null;

  return (
    <section
      className="home-banner"
      aria-roledescription="carrusel"
      aria-label="Promociones PulgasYa"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <div
        className="home-banner__viewport"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <p className="home-banner__sr" aria-live="polite">
          Diapositiva {logicalIndex + 1} de {n}: {items[logicalIndex]?.title}
        </p>

        <div
          className={`home-banner__track${noTransition ? ' home-banner__track--instant' : ''}`}
          style={{ transform: `translateX(-${index * 100}%)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {trackItems.map((slide, i) => {
            const isActive = loop ? i === index : i === index;
            return (
              <Link
                key={slide._key}
                to={slide.href || '/buscar'}
                className="home-banner__slide"
                data-tone={slide.tone || 'celeste'}
                aria-hidden={!isActive || slide._clone ? true : undefined}
                tabIndex={isActive && !slide._clone ? 0 : -1}
              >
                <img
                  src={slide.image}
                  alt=""
                  draggable={false}
                  loading={i <= 1 ? 'eager' : 'lazy'}
                />
                <div className="home-banner__overlay" aria-hidden="true" />
                <div className="home-banner__copy">
                  <p className="home-banner__brand">PulgasYa</p>
                  <h2 className="home-banner__title">{slide.title}</h2>
                  {slide.subtitle && (
                    <p className="home-banner__subtitle">{slide.subtitle}</p>
                  )}
                  {slide.cta && (
                    <span className="home-banner__cta">{slide.cta}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {loop && (
          <>
            <button
              type="button"
              className="home-banner__arrow home-banner__arrow--prev"
              aria-label="Diapositiva anterior"
              onClick={prev}
            >
              ‹
            </button>
            <button
              type="button"
              className="home-banner__arrow home-banner__arrow--next"
              aria-label="Diapositiva siguiente"
              onClick={next}
            >
              ›
            </button>
            <ul className="home-banner__dots" role="tablist" aria-label="Elegir diapositiva">
              {items.map((slide, i) => (
                <li key={slide.id || i} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    className="home-banner__dot"
                    aria-label={`Ir a diapositiva ${i + 1}: ${slide.title}`}
                    aria-current={i === logicalIndex ? 'true' : undefined}
                    onClick={() => goToLogical(i)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

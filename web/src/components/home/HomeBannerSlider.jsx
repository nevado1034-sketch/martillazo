import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_BANNERS } from '../../data/homeBanners.js';
import './HomeBannerSlider.css';

const AUTOPLAY_MS = 4500;

function normalizeSlides(slides) {
  const raw = Array.isArray(slides) && slides.length ? slides : HOME_BANNERS;
  return raw.filter((s) => s && typeof s.image === 'string' && s.image.trim());
}

/**
 * Banner / home slider estilo Mercado Libre.
 * Loop: track = [cloneLast, ...reales, cloneFirst]; índice inicia en 1.
 * Al aterrizar en un clone → transition:none → saltar al real → reflow → reactivar.
 */
export default function HomeBannerSlider({ slides = HOME_BANNERS }) {
  const items = useMemo(() => normalizeSlides(slides), [slides]);
  const n = items.length;
  const loop = n > 1;

  const trackItems = useMemo(() => {
    if (!n) return [];
    if (!loop) {
      return items.map((s, i) => ({
        ...s,
        _key: `solo-${s.id || i}`,
        _clone: false,
        _logical: i,
      }));
    }
    const last = items[n - 1];
    const first = items[0];
    return [
      {
        ...last,
        image: last.image,
        _key: `clone-last-${last.id || n - 1}`,
        _clone: true,
        _logical: n - 1,
      },
      ...items.map((s, i) => ({
        ...s,
        image: s.image,
        _key: `real-${s.id || i}`,
        _clone: false,
        _logical: i,
      })),
      {
        ...first,
        image: first.image,
        _key: `clone-first-${first.id || 0}`,
        _clone: true,
        _logical: 0,
      },
    ];
  }, [items, n, loop]);

  // Índice en el track DOM: con loop, 1 = primer real (0 y n+1 son clones)
  const [index, setIndex] = useState(() => (loop ? 1 : 0));
  const [instant, setInstant] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const indexRef = useRef(loop ? 1 : 0);
  const jumpingRef = useRef(false);
  const trackRef = useRef(null);
  const touchStartX = useRef(null);

  const setTrackIndex = useCallback((next, { silent = false } = {}) => {
    indexRef.current = next;
    if (silent) {
      jumpingRef.current = true;
      setInstant(true);
    }
    setIndex(next);
  }, []);

  // Si cambia el set de slides (o loop on/off), re-sincronizar
  useLayoutEffect(() => {
    const start = loop ? 1 : 0;
    jumpingRef.current = false;
    setInstant(false);
    setTrackIndex(start);
  }, [n, loop, setTrackIndex]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Tras salto silencioso: forzar reflow y reactivar transición
  useLayoutEffect(() => {
    if (!instant) return undefined;
    const el = trackRef.current;
    if (el) {
      // Fuerza paint en la posición real antes de volver a animar
      void el.offsetWidth;
    }
    const id = requestAnimationFrame(() => {
      setInstant(false);
      jumpingRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, [instant, index]);

  const snapIfClone = useCallback(() => {
    if (!loop || jumpingRef.current) return;
    const i = indexRef.current;
    // clone del primero (después del último real) → primer real
    if (i >= n + 1) {
      setTrackIndex(1, { silent: true });
      return;
    }
    // clone del último (antes del primer real) → último real
    if (i <= 0) {
      setTrackIndex(n, { silent: true });
    }
  }, [loop, n, setTrackIndex]);

  // Reduced-motion: no hay transitionend → saltar al montar en clone
  useEffect(() => {
    if (!loop || !reducedMotion) return;
    const i = indexRef.current;
    if (i <= 0 || i >= n + 1) snapIfClone();
  }, [index, loop, n, reducedMotion, snapIfClone]);

  const goDelta = useCallback(
    (delta) => {
      if (!n || jumpingRef.current) return;
      if (!loop) return;
      const cur = indexRef.current;
      // No pasar de los clones (evita “slide vacío”)
      const next = Math.min(n + 1, Math.max(0, cur + delta));
      if (next === cur) return;
      setTrackIndex(next);
    },
    [n, loop, setTrackIndex],
  );

  const goToLogical = useCallback(
    (logical) => {
      if (!n || jumpingRef.current) return;
      const clamped = Math.min(Math.max(logical, 0), n - 1);
      setTrackIndex(loop ? clamped + 1 : clamped);
    },
    [n, loop, setTrackIndex],
  );

  const next = useCallback(() => goDelta(1), [goDelta]);
  const prev = useCallback(() => goDelta(-1), [goDelta]);

  useEffect(() => {
    if (paused || reducedMotion || !loop) return undefined;
    const t = setInterval(() => {
      if (jumpingRef.current) return;
      goDelta(1);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reducedMotion, loop, goDelta]);

  const onTransitionEnd = (e) => {
    if (e.target !== trackRef.current) return;
    if (e.propertyName && e.propertyName !== 'transform') return;
    snapIfClone();
  };

  // Resize: mantener índice; el % del transform ya es relativo al viewport del track
  useEffect(() => {
    const onResize = () => {
      const el = trackRef.current;
      if (!el) return;
      const was = el.style.transition;
      el.style.transition = 'none';
      void el.offsetWidth;
      el.style.transition = was;
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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

  if (!n) return null;

  const logicalIndex = loop
    ? Math.min(Math.max(index - 1, 0), n - 1)
    : Math.min(Math.max(index, 0), n - 1);

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
          ref={trackRef}
          className={`home-banner__track${instant ? ' home-banner__track--instant' : ''}`}
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          onTransitionEnd={onTransitionEnd}
        >
          {trackItems.map((slide, i) => {
            const isActive = i === index;
            return (
              <Link
                key={slide._key}
                to={slide.href || '/buscar'}
                className="home-banner__slide"
                data-tone={slide.tone || 'celeste'}
                aria-hidden={!isActive || slide._clone}
                tabIndex={isActive && !slide._clone ? 0 : -1}
              >
                <img
                  src={slide.image}
                  alt=""
                  draggable={false}
                  // Eager en todos: clones al final no deben quedar en blanco al loopear
                  loading="eager"
                  decoding="async"
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

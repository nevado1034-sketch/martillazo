import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_BANNERS } from '../../data/homeBanners.js';
import './HomeBannerSlider.css';

const AUTOPLAY_MS = 4500;

/**
 * Banner / home slider estilo Mercado Libre:
 * full-bleed bajo el header, autoplay, pause on hover, flechas, dots, swipe.
 */
export default function HomeBannerSlider({ slides = HOME_BANNERS }) {
  const items = slides?.length ? slides : HOME_BANNERS;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const go = useCallback(
    (next) => {
      const n = items.length;
      if (!n) return;
      setIndex(((next % n) + n) % n);
    },
    [items.length],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (paused || reducedMotion || items.length < 2) return undefined;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, reducedMotion, items.length]);

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
        ref={viewportRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <p className="home-banner__sr" aria-live="polite">
          Diapositiva {index + 1} de {items.length}: {items[index].title}
        </p>

        <div
          className="home-banner__track"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {items.map((slide, i) => (
            <Link
              key={slide.id || i}
              to={slide.href || '/buscar'}
              className="home-banner__slide"
              data-tone={slide.tone || 'celeste'}
              aria-hidden={i !== index}
              tabIndex={i === index ? 0 : -1}
            >
              <img
                src={slide.image}
                alt=""
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
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
          ))}
        </div>

        {items.length > 1 && (
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
                    aria-current={i === index ? 'true' : undefined}
                    onClick={() => go(i)}
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

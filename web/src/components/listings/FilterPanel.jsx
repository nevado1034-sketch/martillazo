import { useEffect, useRef, useState } from 'react';
import {
  CONDITIONS,
  DATE_RANGES,
  PRICE_RANGES,
  conditionLabel,
  getDateRange,
} from '../../data/taxonomy.js';

function Dropdown({ id, label, summary, active, open, onToggle, children }) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open === id}
        aria-label={`Filtrar por ${label}`}
        onClick={() => onToggle(open === id ? null : id)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition ${
          active
            ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
            : 'border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--brand-soft)]'
        }`}
      >
        <span>{label}</span>
        {summary && summary !== 'Cualquiera' && summary !== 'Todos' && (
          <span className="max-w-[9rem] truncate text-xs font-medium opacity-80">
            {summary}
          </span>
        )}
        {active && (
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]"
          />
        )}
        <span
          aria-hidden="true"
          className={`text-[10px] opacity-60 transition-transform ${
            open === id ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      {open === id && (
        <div
          role="dialog"
          aria-label={`Filtro de ${label}`}
          className="absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl animate-fade-in"
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'border-[var(--brand)] bg-[var(--mint-soft)] text-[var(--brand-deep)]'
          : 'border-[var(--line)] bg-white text-[var(--ink-muted)] hover:border-[var(--brand-soft)] hover:text-[var(--ink)]'
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterPanel({
  condition = '',
  date = '',
  minPrice = '',
  maxPrice = '',
  isService = false,
  hasFilters = false,
  onCondition,
  onDate,
  onPrice,
  onClear,
}) {
  const [open, setOpen] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const activePriceRange = PRICE_RANGES.find((range) => {
    const min = minPrice === '' ? 0 : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    return (range.min || 0) === (min || 0) && (range.max ?? null) === max;
  });

  const priceSummary = activePriceRange
    ? activePriceRange.label
    : minPrice !== '' || maxPrice !== ''
      ? `S/ ${minPrice || 0} – ${maxPrice ? `S/ ${maxPrice}` : 'más'}`
      : 'Cualquiera';

  const conditionSummary = condition ? conditionLabel(condition) : 'Cualquiera';
  const dateSummary = date ? getDateRange(date)?.label || date : 'Todos';

  const pickPriceRange = (range) => {
    if (activePriceRange?.id === range.id) {
      onPrice({ min: '', max: '' });
      return;
    }
    onPrice({
      min: range.min ? String(range.min) : '',
      max: range.max == null ? '' : String(range.max),
    });
  };

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-2">
      <Dropdown
        id="price"
        label="Precio"
        summary={priceSummary}
        active={minPrice !== '' || maxPrice !== ''}
        open={open}
        onToggle={setOpen}
      >
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--ink-faint)]">
              S/
            </span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={minPrice}
              onChange={(event) =>
                onPrice({ min: event.target.value, max: maxPrice })
              }
              placeholder="Mín."
              aria-label="Precio mínimo en soles"
              className="w-full rounded-lg border border-[var(--line)] bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-[var(--brand)]"
            />
          </label>
          <span className="text-[var(--ink-faint)]">–</span>
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-[var(--ink-faint)]">
              S/
            </span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) =>
                onPrice({ min: minPrice, max: event.target.value })
              }
              placeholder="Máx."
              aria-label="Precio máximo en soles"
              className="w-full rounded-lg border border-[var(--line)] bg-white py-2 pl-8 pr-2 text-xs outline-none focus:border-[var(--brand)]"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((range) => (
            <Chip
              key={range.id}
              active={activePriceRange?.id === range.id}
              onClick={() => pickPriceRange(range)}
            >
              {range.label}
            </Chip>
          ))}
        </div>
      </Dropdown>

      {!isService && (
        <Dropdown
          id="condition"
          label="Estado"
          summary={conditionSummary}
          active={Boolean(condition)}
          open={open}
          onToggle={setOpen}
        >
          <div className="space-y-1">
            {CONDITIONS.map((item) => {
              const active = condition === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCondition(active ? '' : item.value)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                    active
                      ? 'border-[var(--brand)] bg-[var(--mint-soft)]'
                      : 'border-transparent hover:bg-[var(--surface)]'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                      active
                        ? 'border-[var(--brand)] bg-[var(--brand)]'
                        : 'border-[var(--line)] bg-white'
                    }`}
                  >
                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-semibold ${
                        active
                          ? 'text-[var(--brand-deep)]'
                          : 'text-[var(--ink)]'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] leading-tight text-[var(--ink-faint)]">
                      {item.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Dropdown>
      )}

      <Dropdown
        id="date"
        label="Fecha de publicación"
        summary={dateSummary}
        active={Boolean(date)}
        open={open}
        onToggle={setOpen}
      >
        <div className="flex flex-wrap gap-1.5">
          {DATE_RANGES.map((item) => (
            <Chip
              key={item.value}
              active={(date || 'all') === item.value}
              onClick={() => onDate(item.value === 'all' ? '' : item.value)}
            >
              {item.label}
            </Chip>
          ))}
        </div>
      </Dropdown>

      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-xs font-semibold text-[var(--ink-muted)] underline hover:text-[var(--ink)]"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

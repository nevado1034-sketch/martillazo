import {
  CONDITIONS,
  DATE_RANGES,
  PRICE_RANGES,
} from '../../data/taxonomy.js';

function SectionTitle({ children }) {
  return (
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--ink-faint)]">
      {children}
    </h3>
  );
}

function Chip({ active, onClick, children, className = '' }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${className} ${
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
  categories,
  category,
  subcategory,
  attributes = {},
  condition = '',
  date = '',
  minPrice = '',
  maxPrice = '',
  isService = false,
  hasFilters = false,
  onSelectCategory,
  onSelectSubcategory,
  onAttribute,
  onCondition,
  onDate,
  onPrice,
  onClear,
}) {
  const activePriceRange = PRICE_RANGES.find((range) => {
    const min = minPrice === '' ? 0 : Number(minPrice);
    const max = maxPrice === '' ? null : Number(maxPrice);
    return (range.min || 0) === (min || 0) && (range.max ?? null) === max;
  });

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
    <div className="space-y-4">
      {/* Categorías y subcategorías */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Categorías</SectionTitle>
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="text-[11px] font-semibold text-[var(--brand)] hover:underline"
            >
              Limpiar
            </button>
          )}
        </div>

        <ul className="mt-3 space-y-1">
          <li>
            <button
              type="button"
              onClick={() => onSelectCategory(null)}
              className={`w-full rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                !category
                  ? 'bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                  : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
              }`}
            >
              Todas las categorías
            </button>
          </li>
          {categories.map((item) => {
            const active = category?.id === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectCategory(active ? null : item.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition ${
                    active
                      ? 'bg-[var(--mint-soft)] text-[var(--brand-deep)]'
                      : 'text-[var(--ink-muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.subcategories?.length > 0 && (
                    <span aria-hidden="true" className="text-[10px] opacity-60">
                      {active ? '▾' : '›'}
                    </span>
                  )}
                </button>

                {active && item.subcategories?.length > 0 && (
                  <ul className="mb-1 ml-2 mt-1 space-y-0.5 border-l border-[var(--line)] pl-2 animate-fade-in">
                    <li>
                      <button
                        type="button"
                        onClick={() => onSelectSubcategory(null)}
                        className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                          !subcategory
                            ? 'font-semibold text-[var(--brand)]'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        Todas
                      </button>
                    </li>
                    {item.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() =>
                            onSelectSubcategory(
                              subcategory === sub.id ? null : sub.id,
                            )
                          }
                          className={`w-full rounded-md px-2 py-1.5 text-left text-xs transition ${
                            subcategory === sub.id
                              ? 'font-semibold text-[var(--brand)]'
                              : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                          }`}
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <SectionTitle>Filtros</SectionTitle>
          {category && (
            <span className="truncate text-[11px] font-medium text-[var(--ink-faint)]">
              {category.label}
            </span>
          )}
        </div>

        {/* Filtros propios de la categoría */}
        {category?.filters?.length > 0 && (
          <div className="mt-4 space-y-4">
            {category.filters.map((group) => (
              <div key={group.key}>
                <p className="mb-2 text-xs font-semibold text-[var(--ink)]">
                  {group.label}
                </p>
                <div
                  className={`flex flex-wrap gap-1.5 ${
                    group.options.length > 10
                      ? 'max-h-44 overflow-y-auto pr-1'
                      : ''
                  }`}
                >
                  {group.options.map((option) => (
                    <Chip
                      key={option.value}
                      active={attributes[group.key] === option.value}
                      onClick={() =>
                        onAttribute(
                          group.key,
                          attributes[group.key] === option.value
                            ? ''
                            : option.value,
                        )
                      }
                    >
                      {option.label}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
            <div className="border-t border-[var(--line)] pt-3" />
          </div>
        )}

        {/* Precio */}
        <div className={category?.filters?.length ? '' : 'mt-4'}>
          <p className="mb-2 text-xs font-semibold text-[var(--ink)]">Precio</p>
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
          <div className="mt-2 flex flex-wrap gap-1.5">
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
        </div>

        {/* Estado */}
        {!isService && (
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="mb-2 text-xs font-semibold text-[var(--ink)]">Estado</p>
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
          </div>
        )}

        {/* Fecha */}
        <div className="mt-4 border-t border-[var(--line)] pt-3">
          <p className="mb-2 text-xs font-semibold text-[var(--ink)]">
            Fecha de publicación
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DATE_RANGES.map((item) => (
              <Chip
                key={item.value}
                active={
                  (date || 'all') === item.value
                }
                onClick={() =>
                  onDate(item.value === 'all' ? '' : item.value)
                }
              >
                {item.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

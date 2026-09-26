export default function TypeToggle({ value, onChange, className = '' }) {
  const options = [
    { id: 'todos', label: 'Todo' },
    { id: 'producto', label: 'Productos' },
    { id: 'servicio', label: 'Servicios' },
  ];

  return (
    <div
      className={`inline-flex rounded-xl border border-[var(--line)] bg-white p-1 ${className}`}
      role="tablist"
      aria-label="Tipo de anuncio"
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-[var(--brand)] text-white shadow-sm'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

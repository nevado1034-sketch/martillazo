export default function SearchBar({
  value,
  onChange,
  placeholder = 'Busca juguetes, tecnología, autos, departamentos…',
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20"
      />
    </div>
  );
}

export default function FilterPills({ options, value, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={[
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition',
              active
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

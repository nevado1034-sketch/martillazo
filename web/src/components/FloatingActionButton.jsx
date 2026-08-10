export default function FloatingActionButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-brand-600 px-5 py-4 font-bold text-white shadow-fab transition hover:bg-brand-700 active:scale-95"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1Z"
          clipRule="evenodd"
        />
      </svg>
      ¡Dar un Martillazo!
    </button>
  );
}

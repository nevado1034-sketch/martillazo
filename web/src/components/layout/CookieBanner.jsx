import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { readJSON, writeJSON } from '../../utils/storage.js';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = readJSON('cookies-ok', false);
    if (!accepted) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--ink-muted)]">
          Usamos cookies y almacenamiento local esenciales para que PulgasYa
          funcione (sesión y preferencias). No usamos cookies de publicidad de
          terceros. Más información en nuestra{' '}
          <Link to="/cookies" className="text-[var(--primary-celeste)] hover:underline">
            política de cookies
          </Link>
          .
        </p>
        <button
          type="button"
          className="shrink-0 rounded-xl bg-[var(--primary-celeste)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
          onClick={() => {
            writeJSON('cookies-ok', true);
            setVisible(false);
          }}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

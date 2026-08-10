import { useState } from 'react';
import { PROVIDER_LABELS } from '../api/auth.js';

function HammerIcon() {
  return (
    <svg
      className="h-7 w-7 text-brand-600"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.7 7.2a1 1 0 0 0-1.4 0l-1.5 1.5-5.5-5.5 1.5-1.5a1 1 0 0 0 0-1.4L11.5.1a1 1 0 0 0-1.4 0l-.7.7a1 1 0 0 0 0 1.4l1.5 1.5-5.5 5.5-.7-.7a1 1 0 0 0-1.4 0L.1 10.1a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l.7-.7 5.5 5.5-.7.7a1 1 0 0 0 0 1.4l1.5 1.5a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4l-.7-.7 5.5-5.5.7.7a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4l-1.5-1.5a1 1 0 0 0-1.4 0l-.7.7-1.5-1.5 1.5-1.5a1 1 0 0 0 0-1.4Z" />
    </svg>
  );
}

/**
 * Header común: logo, acceso al panel del vendedor, menú de sesión con
 * los datos del cliente verificado y "Abandonar sesión".
 */
export default function Header({
  session,
  onLogin,
  onLogout,
  onNavigateMine,
  onNavigateHome,
  onNavigateProfile,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const userName = session?.user?.fullName ?? null;
  const providerLabel = session?.provider
    ? PROVIDER_LABELS[session.provider] ?? session.provider
    : 'Martillazo';

  return (
    <header className="sticky top-0 z-30 border-b border-amber-100 bg-amber-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900"
        >
          <HammerIcon />
          Martillazo
        </button>

        <div className="flex items-center gap-2">
          {userName && (
            <button
              onClick={onNavigateMine}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
            >
              Mis publicaciones
            </button>
          )}
          {userName ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full bg-slate-900 py-2 pl-3 pr-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden sm:inline">{userName}</span>
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M6 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm4 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z" />
                </svg>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
                    <div className="border-b border-slate-100 p-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        <svg
                          className="h-3.5 w-3.5"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.86-9.14a.75.75 0 0 0-1.06-1.06L9.5 11.1 7.2 8.8a.75.75 0 0 0-1.06 1.06l2.8 2.8a.75.75 0 0 0 1.06 0l4.36-4.36Z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Verificado con {providerLabel}
                      </span>
                      <div className="mt-3 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg font-extrabold text-brand-700">
                          {userName.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{userName}</p>
                          <p className="truncate text-sm text-slate-500">
                            {session?.user?.email}
                          </p>
                        </div>
                      </div>
                      {session?.user?.phone && (
                        <p className="mt-2 text-xs text-slate-400">
                          Celular: {session.user.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onNavigateProfile?.();
                      }}
                      className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3.5 15.5c.9-2.4 3.5-3.5 6.5-3.5s5.6 1.1 6.5 3.5c.3.8 0 1.5-.9 1.5H4.4c-.9 0-1.2-.7-.9-1.5Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Mi cuenta
                    </button>
                    <button
                      onClick={onLogout}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3 3.75A.75.75 0 0 1 3.75 3h9.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-2.25H4.5v11h7.25V13.5a.75.75 0 0 1 1.5 0v2.75a.75.75 0 0 1-.75.75h-9.5A.75.75 0 0 1 3 16.25v-12.5Zm13.28 4.03a.75.75 0 0 1 0 1.06l-1.72 1.72h-5.81a.75.75 0 0 1 0-1.5h5.81l1.72-1.72a.75.75 0 0 1 1.06 0Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Abandonar sesión
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ingresar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

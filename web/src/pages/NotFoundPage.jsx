import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-6xl font-bold text-[var(--primary-celeste)]">
          404
        </p>
        <h1 className="mt-4 font-display text-2xl font-bold text-[var(--ink)]">
          No encontramos esta página
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Puede que el enlace esté mal escrito o que el anuncio ya no exista.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            to="/"
            className="rounded-xl bg-[var(--primary-celeste)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)]"
          >
            Ir al inicio
          </Link>
          <Link
            to="/buscar"
            className="rounded-xl border border-[var(--line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand-soft)]"
          >
            Explorar anuncios
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

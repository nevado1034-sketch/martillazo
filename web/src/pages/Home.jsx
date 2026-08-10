import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchActiveAuctions, fetchCategories } from '../api/auctions.js';
import { createAuctionSocket } from '../api/socket.js';
import useAuctionBid from '../hooks/useAuctionBid.js';
import AuctionCard from '../components/AuctionCard.jsx';
import CreateAuctionModal from '../components/CreateAuctionModal.jsx';
import FilterPills from '../components/FilterPills.jsx';
import FloatingActionButton from '../components/FloatingActionButton.jsx';
import Header from '../components/Header.jsx';
import LoginModal from '../components/LoginModal.jsx';
import SearchBar from '../components/SearchBar.jsx';

const FILTERS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'CACHIVACHES', label: 'Cachivaches' },
  { value: 'BIENES_RAICES', label: 'Bienes Raíces' },
];

const DRAFT_KEY = 'martillazo_draft';

/** Borrador del alta: sobrevive a la recarga del celular al abrir la cámara. */
function loadDraft() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null');
    return raw && typeof raw === 'object' ? raw : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // silencioso
  }
}

function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-3/4 rounded bg-slate-200" />
        <div className="h-6 w-1/2 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function Home({
  session,
  onSession,
  onLogout,
  onNavigateMine,
  onNavigateProfile,
  onOpenDetail,
}) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const [draft, setDraft] = useState(loadDraft);
  const [createOpen, setCreateOpen] = useState(() => Boolean(loadDraft()?.open));
  const socketRef = useRef(null);
  const { ensureSession, placeBid } = useAuctionBid(session, onSession);

  // Debounce del buscador
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  // Categorías para navegar los productos
  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Carga de subastas activas (con tipo, categoría y búsqueda)
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchActiveAuctions({
      type: filter === 'ALL' ? undefined : filter,
      category: category || undefined,
      q: debouncedQuery || undefined,
    })
      .then((data) => {
        if (active) setAuctions(data);
      })
      .catch(() => {
        if (active) setAuctions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, category, debouncedQuery]);

  // Conexión WebSocket: escucha pujas en vivo y extensiones anti-snipe.
  // Se recrea al cambiar el token de sesión (para pujar autenticado).
  useEffect(() => {
    const socket = createAuctionSocket({ token: session?.token });
    socketRef.current = socket;

    socket.on('bid:new', (payload) => {
      setAuctions((prev) =>
        prev.map((auction) =>
          auction.id === payload.auctionId
            ? {
                ...auction,
                current_price: payload.currentPrice,
                extended_until: payload.extended
                  ? payload.endsAt
                  : auction.extended_until,
              }
            : auction,
        ),
      );
    });

    socket.on('auction:extended', ({ auctionId, endsAt }) => {
      setAuctions((prev) =>
        prev.map((auction) =>
          auction.id === auctionId ? { ...auction, extended_until: endsAt } : auction,
        ),
      );
    });

    auctions.forEach((auction) =>
      socket.emit('bid:join', { auctionId: auction.id }),
    );

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  // Suscripción a las salas de cada subasta visible
  const auctionIdsKey = auctions.map((a) => a.id).join(',');
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    auctions.forEach((auction) =>
      socket.emit('bid:join', { auctionId: auction.id }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionIdsKey]);

  /** Alta exitosa: inserta la subasta nueva al tope de la lista. */
  const handleCreated = (created) => {
    setAuctions((prev) => [created, ...prev]);
    clearDraft();
    setDraft(null);
  };

  /** Guarda el borrador mientras se edita el alta. */
  const handleDraftChange = useCallback((data) => {
    setDraft(data);
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ ...data, open: true }));
    } catch {
      // silencioso
    }
  }, []);

  /** Cierra el alta y descarta el borrador. */
  const closeCreate = () => {
    setCreateOpen(false);
    clearDraft();
    setDraft(null);
  };

  /** Abre el alta; si no hay sesión, crea automáticamente la de vendedor demo. */
  const openCreate = async () => {
    try {
      await ensureSession('facebook');
      setCreateOpen(true);
    } catch {
      window.alert('No se pudo iniciar sesión. ¿Está el backend en :4000?');
    }
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <Header
        session={session}
        onLogin={() => setLoginOpen(true)}
        onLogout={onLogout}
        onNavigateMine={onNavigateMine}
        onNavigateHome={() => window.scrollTo({ top: 0 })}
        onNavigateProfile={onNavigateProfile}
      />

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">
        <section className="mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Subasta todo lo que ya no usas.
          </h1>
          <p className="mt-1 text-slate-500">
            Desde cachivaches hasta bienes raíces, el precio lo pone la comunidad.
          </p>
        </section>

        <div className="space-y-3">
          <SearchBar value={query} onChange={setQuery} />
          <FilterPills options={FILTERS} value={filter} onChange={setFilter} />
        </div>

        <section className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Explora por categoría
            </h3>
            {category && (
              <button
                onClick={() => setCategory('')}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Limpiar filtro
              </button>
            )}
          </div>

          <button
            onClick={() => setCategory('')}
            className={`mb-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              category === ''
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas las categorías
          </button>

          {['CACHIVACHES', 'BIENES_RAICES'].map((type) => {
            const items = categories.filter((c) => c.type === type);
            if (items.length === 0) return null;
            return (
              <div key={type} className="mt-3">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {type === 'BIENES_RAICES' ? 'Bienes Raíces' : 'Cachivaches'}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {items.map((c) => {
                    const active = category === c.slug;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setCategory(active ? '' : c.slug)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          active
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">¡Al Martillazo!</h2>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-600" />
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : auctions.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-200">
              No hay subastas activas con estos filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {auctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  isOwn={Boolean(session) && session.userId === auction.seller_id}
                  onBid={placeBid}
                  onOpen={onOpenDetail}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <FloatingActionButton onClick={openCreate} />

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onSuccess={onSession} />

      <CreateAuctionModal
        open={createOpen}
        onClose={closeCreate}
        onCreated={handleCreated}
        token={session?.token}
        initialDraft={draft?.open ? draft : null}
        onDraftChange={handleDraftChange}
      />

      <footer className="border-t border-amber-100 py-6 text-center text-sm text-slate-400">
        Martillazo — Subastas P2P · Escrow protegido · Verificación KYC
      </footer>
    </div>
  );
}

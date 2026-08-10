import { useEffect, useState } from 'react';
import {
  deleteMyAuction,
  fetchAuctionBidders,
  fetchMyAuctions,
} from '../api/auctions.js';
import { formatPrice } from '../utils/format.js';
import CountdownTimer from '../components/CountdownTimer.jsx';
import EditAuctionModal from '../components/EditAuctionModal.jsx';

/**
 * Panel del vendedor: sus publicaciones y, para cada una, quién está pujando
 * (quiénes pagan más y cómo contactarlos) para entablar la venta.
 */
const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-slate-100 text-slate-500',
  AWARDED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  EXPIRED: 'bg-slate-100 text-slate-500',
  CLOSED: 'bg-slate-100 text-slate-500',
  CANCELLED: 'bg-red-100 text-red-700',
  PAUSED: 'bg-slate-100 text-slate-500',
};

const STATUS_LABEL = {
  ACTIVE: 'En vivo',
  PENDING: 'Programada',
  AWARDED: 'Adjudicada',
  COMPLETED: 'Completada',
  EXPIRED: 'Sin ganador',
  CLOSED: 'Cerrada',
  CANCELLED: 'Cancelada',
  PAUSED: 'Pausada',
};

export default function MyAuctions({ session, onBack, onOpenDetail }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [bidders, setBidders] = useState({});
  const [biddersBusy, setBiddersBusy] = useState(false);
  const [biddersError, setBiddersError] = useState('');
  const [editTarget, setEditTarget] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setAuctions(await fetchMyAuctions(session.token));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (a) => {
    setActionError('');
    setEditTarget(a);
  };

  const handleSaved = () => {
    setEditTarget(null);
    load();
  };

  const handleDelete = async (a) => {
    const confirmed = window.confirm(
      `¿Eliminar "${a.title}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setActionError('');
    try {
      await deleteMyAuction({ auctionId: a.id, token: session.token });
      setAuctions((prev) => prev.filter((x) => x.id !== a.id));
    } catch (err) {
      setActionError(err.message);
    }
  };

  const toggleBidders = async (auctionId) => {
    if (openId === auctionId) {
      setOpenId(null);
      return;
    }
    setOpenId(auctionId);
    setBiddersBusy(true);
    setBiddersError('');
    try {
      const result = await fetchAuctionBidders({ auctionId, token: session.token });
      setBidders((prev) => ({ ...prev, [auctionId]: result }));
    } catch (err) {
      setBiddersError(err.message);
    } finally {
      setBiddersBusy(false);
    }
  };

  const name = session?.user?.fullName ?? 'Tú';

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="sticky top-0 z-30 border-b border-amber-100 bg-amber-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white hover:shadow-sm"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.7 4.3a1 1 0 0 1 0 1.4L6.4 10l4.3 4.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />
            </svg>
            Volver
          </button>
          <div className="text-right">
            <p className="text-sm font-extrabold text-slate-900">Mis publicaciones</p>
            <p className="text-xs text-slate-500">Sesión de {name}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              Tus subastas en curso
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Mira quién está pujando y entabla la venta con el que más ofrece.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
          >
            Actualizar
          </button>
        </section>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        {actionError && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {actionError}
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-2xl bg-white ring-1 ring-slate-200"
              />
            ))}
          </div>
        ) : auctions.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-slate-200">
            <p className="font-semibold text-slate-700">Aún no publicas nada</p>
            <p className="mt-1 text-sm text-slate-400">
              {name === 'Juan Comprador'
                ? 'Estás como comprador. Entra con Facebook (vendedor) para ver tus publicaciones.'
                : 'Da un Martillazo desde la pantalla principal para crear tu primera subasta.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {auctions.map((a) => (
              <article
                key={a.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-center gap-4 p-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {a.photos?.[0] ? (
                      <img
                        src={a.photos[0]}
                        alt={a.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-300">
                        Sin foto
                      </div>
                    )}
                    {a.videoUrl && (
                      <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded bg-slate-900/70">
                        <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M6.3 2.84A1 1 0 0 0 4.73 3.72v12.56a1 1 0 0 0 1.57.88l10-6.28a1 1 0 0 0 0-1.66l-10-6.38Z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-400">
                      {a.category ?? a.product_condition} · {a.bid_count} puja(s)
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-sm">
                      <span className="font-bold text-slate-900">
                        {formatPrice(a.current_price)}
                      </span>
                      {a.top_bidder_name && a.status === 'ACTIVE' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                          ▲ {a.top_bidder_name} ofrece {formatPrice(a.top_bid)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-500'}`}
                    >
                      {STATUS_LABEL[a.status] ?? a.status}
                    </span>
                    {a.status === 'ACTIVE' ? (
                      <>
                        <CountdownTimer endsAt={a.extended_until ?? a.ends_at} />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBidders(a.id)}
                            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-800"
                          >
                            {openId === a.id ? 'Ocultar postores' : 'Ver postores'}
                          </button>
                          <button
                            onClick={() => handleEdit(a)}
                            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-slate-400"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(a)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    ) : a.status === 'AWARDED' ? (
                      <button
                        onClick={() => onOpenDetail(a.id)}
                        className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
                      >
                        Gestionar cierre
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenDetail(a.id)}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        Ver detalle
                      </button>
                    )}
                  </div>
                </div>

                {openId === a.id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quién paga más
                    </p>
                    {biddersBusy ? (
                      <p className="text-sm text-slate-400">Cargando postores…</p>
                    ) : biddersError ? (
                      <p className="text-sm text-red-600">{biddersError}</p>
                    ) : !bidders[a.id] || bidders[a.id].bidders.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Todavía no hay pujas. Comparte tu publicación.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {bidders[a.id].bidders.map((b, i) => (
                          <div
                            key={b.id}
                            className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${
                              i === 0
                                ? 'bg-brand-50 ring-1 ring-brand-200'
                                : 'bg-white ring-1 ring-slate-200'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {i === 0 && (
                                  <span className="mr-1.5 inline-block rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                    MEJOR
                                  </span>
                                )}
                                {b.full_name}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {b.email}
                                {b.phone ? ` · ${b.phone}` : ''}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-bold text-slate-900">
                                {formatPrice(b.amount)}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {new Date(b.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      {editTarget && (
        <EditAuctionModal
          auction={editTarget}
          token={session.token}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

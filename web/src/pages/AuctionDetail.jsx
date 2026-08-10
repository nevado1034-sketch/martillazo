import { useEffect, useMemo, useState } from 'react';
import {
  fetchAuctionDetail,
  fetchDeliveryState,
  payWinningAuction,
  confirmDelivery,
  settleAuction,
} from '../api/auctions.js';
import { createAuctionSocket } from '../api/socket.js';
import useAuctionBid from '../hooks/useAuctionBid.js';
import Header from '../components/Header.jsx';
import CountdownTimer from '../components/CountdownTimer.jsx';
import LoginModal from '../components/LoginModal.jsx';
import { useToast } from '../components/Toast.jsx';
import { formatPrice } from '../utils/format.js';

const FLOW_LABELS = {
  STANDARD: 'Cachivache',
  PREMIUM: 'Bien Raíz',
};

const TYPE_BADGE = {
  CACHIVACHES: 'bg-sky-100 text-sky-800',
  BIENES_RAICES: 'bg-amber-100 text-amber-800',
};

const CONDITION_LABELS = {
  NEW: 'Nuevo',
  LIKE_NEW: 'Como nuevo',
  USED: 'Usado',
  REFURBISHED: 'Reacondicionado',
  DEFECTIVE: 'Con defectos',
};

const BID_STATUS_LABELS = {
  PENDING: 'En verificación',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  OUTBID: 'Superada',
};

const dateFormat = new Intl.DateTimeFormat('es-PE', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function BackIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 0 1-.75.75H5.61l4.16 4.16a.75.75 0 1 1-1.06 1.06L3.25 10.5a.75.75 0 0 1 0-1.06l5.46-5.47a.75.75 0 0 1 1.06 1.06L5.61 9.25H16.25A.75.75 0 0 1 17 10Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="aspect-[16/10] rounded-2xl bg-slate-200" />
      <div className="h-6 w-1/2 rounded bg-slate-200" />
      <div className="h-4 w-1/3 rounded bg-slate-200" />
    </div>
  );
}

export default function AuctionDetail({
  session,
  onSession,
  onLogout,
  onNavigateMine,
  onNavigateProfile,
  onNavigateHome,
  onBack,
  auctionId,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [walletWarning, setWalletWarning] = useState('');
  const [loginOpen, setLoginOpen] = useState(false);
  const toast = useToast();
  const { placeBid } = useAuctionBid(session, onSession);

  const loadDetail = () => {
    setLoading(true);
    setError('');
    return fetchAuctionDetail(auctionId)
      .then((data) => {
        setDetail(data);
        setActivePhoto(data.auction.photos?.[0] ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    setDetail(null);
    setActivePhoto(null);
    loadDetail();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId]);

  // Actualización en vivo de la subasta abierta.
  useEffect(() => {
    if (!detail) return undefined;
    const socket = createAuctionSocket({ token: session?.token });
    socket.emit('bid:join', { auctionId });

    socket.on('bid:new', (payload) => {
      if (payload.auctionId !== auctionId) return;
      setDetail((prev) => {
        if (!prev) return prev;
        const liveBid = {
          id: `live-${payload.currentPrice}`,
          amount: payload.currentPrice,
          bid_status: 'PENDING',
          created_at: new Date().toISOString(),
        };
        return {
          ...prev,
          auction: {
            ...prev.auction,
            currentPrice: payload.currentPrice,
            endsAt: payload.extended ? payload.endsAt : prev.auction.endsAt,
            bidCount: prev.auction.bidCount + 1,
          },
          bids: [liveBid, ...prev.bids].slice(0, 20),
        };
      });
    });

    socket.on('auction:extended', ({ auctionId: id, endsAt }) => {
      if (id !== auctionId) return;
      setDetail((prev) =>
        prev ? { ...prev, auction: { ...prev.auction, endsAt } } : prev,
      );
    });

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionId, Boolean(detail)]);

  const auction = detail?.auction ?? null;
  const bids = detail?.bids ?? [];
  const isOwn = Boolean(session) && auction?.seller?.id === session.userId;
  const isWinner = Boolean(session) && auction?.winnerId === session.userId;

  const currentPrice = Number(auction?.currentPrice ?? 0);
  const minBid = currentPrice + Number(auction?.minIncrement ?? 0);
  const downPaymentCents = Number(auction?.downPaymentCents ?? 0);
  const payNowCents = Math.max(currentPrice * 100 - downPaymentCents, 0);
  const topBid = useMemo(
    () => bids.reduce((max, bid) => Math.max(max, Number(bid.amount)), 0),
    [bids],
  );

  const isLive = Boolean(auction) && !auction.ended && auction.status === 'ACTIVE';

  const handleBid = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < minBid) {
      setFeedback(`Puja mínima: ${formatPrice(minBid)}`);
      return;
    }
    setBusy(true);
    setFeedback('');
    setWalletWarning('');
    try {
      await placeBid(auction.id, value);
      setAmount('');
      toast.success('Puja enviada ✓');
    } catch (err) {
      if (err.code === 'WALLET_INSUFFICIENT') {
        setWalletWarning(err.message);
      } else {
        toast.error(err.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    if (!session || !auction) return;
    setBusy(true);
    try {
      await payWinningAuction({
        auctionId: auction.id,
        amount: payNowCents / 100,
        token: session.token,
        idempotencyKey: `pay-${auction.id}-${Date.now()}`,
      });
      toast.success('Pago recibido: garantía en custodia ✓');
      await loadDetail();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!session || !auction) return;
    setBusy(true);
    try {
      await confirmDelivery({ auctionId: auction.id, token: session.token });
      toast.success('Entrega confirmada ✓');
      await loadDetail();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async () => {
    if (!session || !auction) return;
    setBusy(true);
    try {
      const result = await settleAuction({
        auctionId: auction.id,
        token: session.token,
      });
      const net = Number(result.released?.net_to_seller_cents ?? 0) / 100;
      toast.success(`Venta cerrada · recibiste ${formatPrice(net)} ✓`);
      await loadDetail();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const renderSettlementPanel = () => {
    if (!auction) return null;

    // Flujo PREMIUM: cierre notarial offline.
    if (auction.flow === 'PREMIUM') {
      return (
        <div className="space-y-3">
          <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-center text-xs font-semibold text-amber-800">
            Adjudicada · Cierre notarial fuera de línea
          </p>
          {auction.notaryClosureDeadline && (
            <p className="text-center text-xs text-slate-500">
              Firma prevista:{' '}
              {dateFormat.format(new Date(auction.notaryClosureDeadline))}
            </p>
          )}
        </div>
      );
    }

    const payment = auction.payment;
    const delivery = auction.delivery;
    const paid = payment && ['HOLD_ESCROW', 'DISPUTED', 'COMPLETED'].includes(payment.status);
    const delivered = Boolean(delivery?.buyer_confirmed);

    if (auction.status === 'EXPIRED' || (!auction.winnerId && !auction.winner)) {
      return (
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
          Finalizada sin ganador
        </p>
      );
    }

    if (auction.status === 'COMPLETED') {
      return (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">
          {isWinner
            ? 'Compra completada ✓'
            : isOwn
              ? 'Venta completada · escrow liberado ✓'
              : 'Venta completada ✓'}
        </p>
      );
    }

    if (auction.status === 'AWARDED') {
      if (isWinner) {
        if (!paid) {
          return (
            <div className="space-y-2">
              {downPaymentCents > 0 && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                  Ya pagaste {formatPrice(downPaymentCents / 100)} con tu
                  garantía de la billetera
                </p>
              )}
              {payNowCents > 0 ? (
                <button
                  onClick={handlePay}
                  disabled={busy}
                  className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy
                    ? 'Procesando…'
                    : `Pagar ${formatPrice(payNowCents / 100)}`}
                </button>
              ) : (
                <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">
                  Tu garantía cubre el precio final · confirma la entrega
                </p>
              )}
            </div>
          );
        }
        if (delivery?.dispute_opened) {
          return (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-xs font-semibold text-red-700">
              Disputa abierta · fondos congelados
            </p>
          );
        }
        if (!delivered) {
          return (
            <button
              onClick={handleConfirmDelivery}
              disabled={busy}
              className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? '…' : 'Confirmar entrega'}
            </button>
          );
        }
        return (
          <p className="rounded-xl bg-sky-50 px-3 py-2.5 text-center text-xs font-semibold text-sky-700">
            Entrega confirmada · esperando cierre del vendedor
          </p>
        );
      }

      if (isOwn) {
        if (!paid) {
          return (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
              Esperando pago de la garantía del ganador
            </p>
          );
        }
        if (delivery?.dispute_opened) {
          return (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-center text-xs font-semibold text-red-700">
              Disputa abierta · soporte interviene
            </p>
          );
        }
        if (!delivered) {
          return (
            <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
              Esperando confirmación de entrega del ganador
            </p>
          );
        }
        return (
          <button
            onClick={handleSettle}
            disabled={busy}
            className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? 'Cerrando…' : 'Cerrar venta y recibir pago'}
          </button>
        );
      }

      return (
        <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
          Adjudicada a {auction.winner?.name ?? 'un ganador'} por{' '}
          {formatPrice(currentPrice)}
        </p>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-amber-50">
      <Header
        session={session}
        onLogin={() => setLoginOpen(true)}
        onLogout={onLogout}
        onNavigateMine={onNavigateMine}
        onNavigateHome={onNavigateHome}
        onNavigateProfile={onNavigateProfile}
      />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-100"
        >
          <BackIcon />
          Volver
        </button>

        {loading && <DetailSkeleton />}

        {!loading && error && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-400 ring-1 ring-slate-200">
            {error}
            <div className="mt-4">
              <button
                onClick={onBack}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        )}

        {!loading && !error && auction && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="min-w-0 space-y-6">
              {/* Galería de fotos */}
              <div>
                <div className="aspect-[16/10] overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                  {activePhoto ? (
                    <img
                      src={activePhoto}
                      alt={auction.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      Sin foto
                    </div>
                  )}
                </div>
                {auction.photos.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto">
                    {auction.photos.map((photo, i) => (
                      <button
                        key={`${photo}-${i}`}
                        onClick={() => setActivePhoto(photo)}
                        className={`h-16 w-24 shrink-0 overflow-hidden rounded-xl ring-2 transition ${
                          activePhoto === photo
                            ? 'ring-brand-500'
                            : 'ring-transparent hover:ring-slate-300'
                        }`}
                      >
                        <img
                          src={photo}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}

                {auction.videoUrl && (
                  <div className="mt-3">
                    <div className="overflow-hidden rounded-2xl bg-black ring-1 ring-slate-200">
                      <video
                        src={auction.videoUrl}
                        controls
                        poster={auction.photos[0] ?? undefined}
                        className="aspect-[16/9] w-full"
                      />
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-400">
                      🎬 Video del vendedor
                    </p>
                  </div>
                )}
              </div>

              {/* Título y badges */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_BADGE[auction.categoryType]}`}
                  >
                    {FLOW_LABELS[auction.flow]}
                  </span>
                  {auction.category && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      {auction.category}
                    </span>
                  )}
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    {CONDITION_LABELS[auction.productCondition] ?? auction.productCondition}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                  {auction.title}
                </h1>
              </div>

              {/* Vendedor */}
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl font-extrabold text-brand-700">
                  {auction.seller.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">{auction.seller.name}</p>
                  <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
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
                    {auction.seller.kycStatus === 'VERIFIED'
                      ? 'Identidad verificada'
                      : 'Pendiente de verificación'}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Descripción
                </h2>
                <p className="mt-2 whitespace-pre-line text-slate-700">
                  {auction.description || 'El vendedor no agregó una descripción.'}
                </p>
              </div>
            </div>

            {/* Sidebar: pujar + historial */}
            <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-400">Puja actual</p>
                  {isLive ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                      EN VIVO
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-600 px-2.5 py-1 text-xs font-semibold text-white">
                      Finalizada
                    </span>
                  )}
                </div>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">
                  {formatPrice(currentPrice)}
                </p>
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500">
                    {isLive ? 'Cierra en' : 'Cerrada'}
                  </span>
                  {isLive ? (
                    <CountdownTimer endsAt={auction.endsAt} className="text-base" />
                  ) : (
                    <span className="text-sm font-bold text-slate-700">
                      {auction.closedAt
                        ? dateFormat.format(new Date(auction.closedAt))
                        : dateFormat.format(new Date(auction.endsAt))}
                    </span>
                  )}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-400">Puja mínima</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatPrice(minBid)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Incremento mínimo</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatPrice(auction.minIncrement)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Pujas recibidas</dt>
                    <dd className="font-semibold text-slate-900">
                      {auction.bidCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-400">Precio inicial</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatPrice(auction.startingPrice)}
                    </dd>
                  </div>
                </dl>

                {auction.flow === 'PREMIUM' && auction.notaryClosureDeadline && (
                  <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    Cierre notarial previsto:{' '}
                    {dateFormat.format(new Date(auction.notaryClosureDeadline))}
                  </p>
                )}

                <div className="mt-5 border-t border-slate-100 pt-4">
                  {!isLive ? (
                    renderSettlementPanel()
                  ) : isOwn ? (
                    <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-400">
                      Es tu subasta · administra desde “Mis publicaciones”
                    </p>
                  ) : (
                    <>
                      {auction.flow === 'STANDARD' && (
                        <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                          Al pujar retenemos S/ 10.00 de tu billetera como
                          garantía. Se aplica a tu pago si ganas; se libera si
                          te superan.
                        </p>
                      )}
                      {walletWarning && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                          <p>{walletWarning}</p>
                          <button
                            onClick={onNavigateProfile}
                            className="mt-1.5 rounded-full bg-red-600 px-3 py-1 font-semibold text-white transition hover:bg-red-700"
                          >
                            Recargar en Mi cuenta
                          </button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={minBid}
                          step="0.01"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            setFeedback('');
                            setWalletWarning('');
                          }}
                          placeholder={formatPrice(minBid)}
                          className="w-full min-w-0 rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                          aria-label="Monto de tu puja"
                        />
                        <button
                          onClick={handleBid}
                          disabled={busy}
                          className="shrink-0 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                        >
                          {busy ? '…' : 'Pujar'}
                        </button>
                      </div>
                      {feedback && (
                        <p className="mt-1.5 text-xs font-medium text-slate-500">
                          {feedback}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Historial de pujas */}
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Historial de pujas
                </h3>
                {bids.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    Aún no hay pujas. ¡Sé el primero!
                  </p>
                ) : (
                  <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                    {bids.map((bid) => {
                      const isTop = Number(bid.amount) === topBid;
                      return (
                        <li
                          key={bid.id}
                          className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 ${
                            isTop
                              ? 'bg-brand-50 ring-1 ring-brand-200'
                              : 'bg-slate-50'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {formatPrice(bid.amount)}
                            </p>
                            <p className="text-xs text-slate-400">
                              {dateFormat.format(new Date(bid.created_at))}
                            </p>
                          </div>
                          <div className="text-right">
                            {isTop && (
                              <span className="text-xs font-bold text-brand-600">
                                Mejor puja
                              </span>
                            )}
                            <p className="text-xs text-slate-400">
                              {BID_STATUS_LABELS[bid.bid_status] ?? bid.bid_status}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={onSession}
      />

      <footer className="border-t border-amber-100 py-6 text-center text-sm text-slate-400">
        Martillazo — Subastas P2P · Escrow protegido · Verificación KYC
      </footer>
    </div>
  );
}

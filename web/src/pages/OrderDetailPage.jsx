import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { formatPrice } from '../utils/format.js';
import {
  confirmOrder,
  deliverOrder,
  disputeOrder,
  fetchOrder,
  payOrderSandbox,
  shipOrder,
} from '../api/escrow.js';

const STATUS_ES = {
  pending_payment: 'Pendiente de pago',
  held: 'En custodia PulgasYa',
  shipped: 'Enviado',
  delivered: 'Entregado / recibido',
  released: 'Liberado al vendedor',
  refunded: 'Reembolsado',
  disputed: 'En disputa',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const { user, token, requireAuth, setAuthOpen, booting } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setOrder(await fetchOrder(token, id));
    } catch (err) {
      push(err.message || 'No se pudo cargar el pedido');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [token, id, push]);

  useEffect(() => {
    if (booting) return;
    if (!token) {
      requireAuth();
      setAuthOpen(true);
      return;
    }
    load();
  }, [booting, token, requireAuth, setAuthOpen, load]);

  useEffect(() => {
    if (order?.status !== 'delivered') return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [order?.status]);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const data = await fn();
      setOrder(data.order || data);
      if (okMsg) push(okMsg);
    } catch (err) {
      push(err.message || 'Error');
    } finally {
      setBusy(false);
    }
  };

  if (booting || loading) {
    return (
      <Shell>
        <p className="text-sm text-[var(--ink-muted)]">Cargando pedido…</p>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <p className="text-sm">Pedido no encontrado.</p>
        <Link to="/mis-pedidos" className="mt-4 inline-block text-[var(--primary-celeste)]">
          Mis pedidos
        </Link>
      </Shell>
    );
  }

  const isBuyer = user?.id === order.buyerId;
  const isSeller = user?.id === order.sellerId;
  const countdown = formatCountdown(order, tick);

  return (
    <Shell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-[var(--ink-muted)] hover:text-[var(--primary-celeste)]"
      >
        ← Volver
      </button>
      <h1 className="mt-3 font-display text-3xl font-bold">Pedido</h1>
      <p className="mt-1 text-sm text-[var(--ink-muted)]">{order.listingTitle}</p>

      <div className="mt-6 rounded-2xl border border-[var(--line)] bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary-celeste)]">
          {STATUS_ES[order.status] || order.status}
        </p>
        <p className="mt-2 font-display text-2xl font-bold text-[var(--cta-orange)]">
          {formatPrice(order.amount)}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-[var(--ink-muted)]">
          <li>
            Comisión PulgasYa ({order.commissionPercent}%):{' '}
            {formatPrice(order.commissionAmount)}
          </li>
          <li>Neto vendedor: {formatPrice(order.netToSeller)}</li>
          <li>Proveedor: {order.paymentProvider}</li>
        </ul>
        <p className="mt-4 rounded-xl bg-[var(--mint-wash)] px-3 py-2 text-xs leading-relaxed text-[var(--ink)]">
          {order.escrowNote}
          {order.sandboxLabel ? ` · ${order.sandboxLabel}` : ''}
        </p>
        {countdown && (
          <p className="mt-3 text-sm font-semibold text-[var(--cta-orange)]">
            Liberación automática en {countdown}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-2">
        {isBuyer &&
          order.status === 'pending_payment' &&
          import.meta.env.VITE_ENABLE_SANDBOX_PAY === 'true' && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(
                async () => {
                  const r = await payOrderSandbox(token, order.id);
                  return r.order;
                },
                'Pago en custodia (sandbox)',
              )
            }
            className="rounded-xl bg-[var(--cta-orange)] py-3.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Pagar en custodia PulgasYa (sandbox)
          </button>
        )}
        {isBuyer &&
          order.status === 'pending_payment' &&
          import.meta.env.VITE_ENABLE_SANDBOX_PAY !== 'true' && (
          <p className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--ink-muted)]">
            El pago en línea aún no está habilitado. Coordina con el vendedor por
            WhatsApp o espera la pasarela de cobro.
          </p>
        )}

        {isSeller && order.status === 'held' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => shipOrder(token, order.id), 'Marcado como enviado')}
            className="rounded-xl bg-[var(--primary-celeste)] py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Marcar enviado
          </button>
        )}

        {(isSeller || isBuyer) &&
          (order.status === 'held' || order.status === 'shipped') && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() => deliverOrder(token, order.id), 'Entrega registrada — reloj 24 h')
              }
              className="rounded-xl border border-[var(--primary-celeste)] py-3 text-sm font-semibold text-[var(--primary-celeste)] disabled:opacity-50"
            >
              Marcar entregado / recibido
            </button>
          )}

        {isBuyer &&
          ['held', 'shipped', 'delivered'].includes(order.status) && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(() => confirmOrder(token, order.id), 'Confirmado — fondos liberados')
              }
              className="rounded-xl bg-[var(--primary-celeste)] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Confirmar recepción / conformidad
            </button>
          )}

        {isBuyer &&
          ['held', 'shipped', 'delivered'].includes(order.status) && (
            <div className="mt-2 space-y-2 rounded-xl border border-[var(--cta-orange)]/40 p-3">
              <p className="text-xs text-[var(--ink-muted)]">
                Reclamo dentro de 24 h tras la entrega pausa la liberación.
              </p>
              <textarea
                className="field-input min-h-[80px]"
                placeholder="Describe el problema…"
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => disputeOrder(token, order.id, disputeReason),
                    'Reclamo registrado',
                  )
                }
                className="rounded-xl bg-[var(--cta-orange)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Abrir reclamo
              </button>
            </div>
          )}

        {order.status === 'released' && (
          <p className="text-sm text-[var(--primary-hover)]">
            Fondos liberados al vendedor (neto {formatPrice(order.netToSeller)}).
            Comisión plataforma: {formatPrice(order.commissionAmount)}.
          </p>
        )}
        {order.status === 'disputed' && (
          <p className="text-sm text-[var(--cta-orange)]">
            En mediación. Motivo: {order.disputeReason}
          </p>
        )}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--ink-faint)]">
        <Link to="/mis-pedidos" className="text-[var(--primary-celeste)] hover:underline">
          Mis pedidos
        </Link>
        {' · '}
        <Link to="/mis-ventas" className="text-[var(--primary-celeste)] hover:underline">
          Mis ventas
        </Link>
      </p>
    </Shell>
  );
}

function formatCountdown(order, _tick) {
  if (order.status !== 'delivered' || !order.releaseDueAt) return null;
  const ms = new Date(order.releaseDueAt).getTime() - Date.now();
  if (ms <= 0) return '0:00:00 (liberando…)';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

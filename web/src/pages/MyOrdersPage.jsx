import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { fetchMyOrders } from '../api/escrow.js';
import { formatPrice } from '../utils/format.js';

const STATUS_ES = {
  pending_payment: 'Pendiente de pago',
  held: 'En custodia',
  shipped: 'Enviado',
  delivered: 'Entregado',
  released: 'Liberado',
  refunded: 'Reembolsado',
  disputed: 'Disputa',
};

export default function MyOrdersPage() {
  const { token, user, requireAuth, setAuthOpen } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setOrders([]);
      return;
    }
    setLoading(true);
    fetchMyOrders(token, 'all')
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Mis pedidos</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Compras y ventas con pago en custodia PulgasYa. Comisión por defecto
          10% al liberar.
        </p>

        {!token && (
          <button
            type="button"
            className="mt-6 rounded-xl bg-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-white"
            onClick={() => {
              requireAuth();
              setAuthOpen(true);
            }}
          >
            Entrar
          </button>
        )}

        {token && loading && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Cargando…</p>
        )}

        {token && !loading && orders.length === 0 && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">
            Aún no hay pedidos.{' '}
            <Link to="/buscar" className="text-[var(--primary-celeste)] hover:underline">
              Explorar
            </Link>
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {orders.map((o) => {
            const role =
              user?.id === o.buyerId
                ? 'Comprador'
                : user?.id === o.sellerId
                  ? 'Vendedor'
                  : '';
            return (
              <li key={o.id}>
                <Link
                  to={`/pedido/${o.id}`}
                  className="block rounded-2xl border border-[var(--line)] bg-white p-4 transition hover:border-[var(--primary-celeste)]"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{o.listingTitle}</span>
                    <span className="font-bold text-[var(--cta-orange)]">
                      {formatPrice(o.amount)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {role} · {STATUS_ES[o.status] || o.status}
                    {o.status === 'released'
                      ? ` · neto ${formatPrice(o.netToSeller)}`
                      : ''}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}

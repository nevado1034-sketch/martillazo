import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { fetchMySales, respondOffer } from '../api/offers.js';
import { fetchMyOrders } from '../api/escrow.js';
import { formatPrice } from '../utils/format.js';
import { buildWhatsAppLink } from '../utils/whatsapp.js';

export default function MySalesPage() {
  const { token, requireAuth, setAuthOpen } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [sellerOrders, setSellerOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!token) {
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, orders] = await Promise.all([
        fetchMySales(token),
        fetchMyOrders(token, 'seller'),
      ]);
      setSales(s);
      setSellerOrders(orders);
    } catch {
      setSales([]);
      setSellerOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (offerId, action) => {
    setBusyId(offerId);
    try {
      const result = await respondOffer(token, offerId, action);
      push(action === 'accept' ? 'Oferta aceptada — pedido en custodia' : 'Oferta rechazada');
      await load();
      if (action === 'accept' && result?.orderId) {
        navigate(`/pedido/${result.orderId}`);
      }
    } catch (err) {
      push(err.message || 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Mis ventas</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Ofertas recibidas y pedidos en custodia. Al aceptar se crea un pedido;
          el comprador paga a PulgasYa (no a ti). Comisión 10% al liberar.
        </p>

        {token && sellerOrders.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-lg font-bold text-[var(--primary-celeste)]">
              Pedidos / payout
            </h2>
            <ul className="mt-3 space-y-2">
              {sellerOrders.map((o) => (
                <li key={o.id}>
                  <Link
                    to={`/pedido/${o.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm hover:border-[var(--primary-celeste)]"
                  >
                    <span className="font-medium">{o.listingTitle}</span>
                    <span className="text-[var(--ink-muted)]">
                      {o.status}
                      {o.status === 'released'
                        ? ` · neto ${formatPrice(o.netToSeller)}`
                        : ` · bruto ${formatPrice(o.amount)}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!token && (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <p className="text-sm text-[var(--ink-muted)]">
              Entra para ver tus ventas.
            </p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-white"
              onClick={() => {
                requireAuth();
                setAuthOpen(true);
              }}
            >
              Entrar
            </button>
          </div>
        )}

        {token && loading && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Cargando…</p>
        )}

        {token && !loading && sales.length === 0 && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">
            Aún no tienes ofertas en tus anuncios.{' '}
            <Link
              to="/publicar"
              className="font-semibold text-[var(--primary-celeste)] hover:underline"
            >
              Publicar
            </Link>
          </p>
        )}

        <ul className="mt-6 space-y-3">
          {sales.map((o) => (
            <li
              key={o.id}
              className="rounded-2xl border border-[var(--line)] bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  to={`/anuncio/${o.listingId}`}
                  className="font-semibold text-[var(--ink)] hover:text-[var(--primary-celeste)]"
                >
                  {o.listingTitle}
                </Link>
                <span className="text-sm font-bold text-[var(--cta-orange)]">
                  {formatPrice(o.amount)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[var(--ink-muted)]">
                De {o.buyer?.name || 'Comprador'} · Precio anuncio{' '}
                {formatPrice(o.listingPrice)} ·{' '}
                <StatusBadge status={o.status} />
              </p>
              {o.message && (
                <p className="mt-2 text-sm text-[var(--ink)]">{o.message}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {o.status === 'pendiente' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => act(o.id, 'accept')}
                      className="rounded-lg bg-[var(--primary-celeste)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Aceptar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => act(o.id, 'reject')}
                      className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {o.buyer?.phone && (
                  <a
                    href={buildWhatsAppLink({
                      phone: o.buyer.phone,
                      text: `Hola, sobre tu oferta en "${o.listingTitle}" en PulgasYa`,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-[var(--cta-orange)] px-3 py-2 text-xs font-semibold text-white"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pendiente: 'Pendiente',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
  };
  return (
    <span className="font-semibold text-[var(--primary-celeste)]">
      {map[status] || status}
    </span>
  );
}

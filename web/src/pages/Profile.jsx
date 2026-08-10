import { useEffect, useState } from 'react';
import { PROVIDER_LABELS, fetchMe, requestKyc, updateProfile } from '../api/auth.js';
import { fetchMyBids } from '../api/auctions.js';
import { fetchWalletState, topupWallet } from '../api/wallet.js';
import { useToast } from '../components/Toast.jsx';
import Header from '../components/Header.jsx';
import { formatPrice } from '../utils/format.js';

const KYC_LABELS = {
  NOT_STARTED: 'Sin verificar',
  PENDING: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazada',
};

const KYC_BADGE = {
  NOT_STARTED: 'bg-slate-100 text-slate-600 ring-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  VERIFIED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-600 ring-red-200',
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100';

export default function Profile({
  session,
  onSession,
  onLogout,
  onNavigateHome,
  onNavigateMine,
  onOpenDetail,
}) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [kycBusy, setKycBusy] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [wallet, setWallet] = useState(null);
  const [topup, setTopup] = useState({
    method: 'YAPE',
    amount: '20',
    referenceCode: '',
  });
  const [topupBusy, setTopupBusy] = useState(false);

  const token = session?.token;

  const refreshProfile = async () => {
    try {
      const [me, myBids, walletState] = await Promise.all([
        fetchMe(token),
        fetchMyBids(token),
        fetchWalletState(token),
      ]);
      setUser(me);
      setBids(myBids);
      setWallet(walletState);
      setForm({ fullName: me.fullName ?? '', phone: me.phone ?? '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateProfile(token, {
        fullName: form.fullName,
        phone: form.phone,
      });
      setUser(updated);
      onSession({ ...session, user: updated });
      toast.success('Perfil actualizado ✓');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKyc = async () => {
    setKycBusy(true);
    try {
      const updated = await requestKyc(token);
      setUser(updated);
      onSession({ ...session, user: updated });
      toast.info('Solicitud de verificación enviada. Revisaremos tu identidad.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setKycBusy(false);
    }
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    setTopupBusy(true);
    try {
      const result = await topupWallet({
        token,
        amount: topup.amount,
        method: topup.method,
        referenceCode: topup.referenceCode,
      });
      setWallet((w) => ({
        ...w,
        balanceCents: result.balanceCents,
        heldCents: result.heldCents,
        availableCents: result.availableCents,
        transactions: [
          result.transaction,
          ...(w?.transactions ?? []),
        ].slice(0, 12),
      }));
      setTopup((t) => ({ ...t, referenceCode: '' }));
      toast.success('Recarga confirmada ✓');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTopupBusy(false);
    }
  };

  const needsReference = topup.method !== 'CARD';

  const providerLabel = session?.provider
    ? PROVIDER_LABELS[session.provider] ?? session.provider
    : null;

  const kycStatus = user?.kycStatus;

  return (
    <div className="min-h-screen bg-amber-50">
      <Header
        session={session}
        onLogin={() => {}}
        onLogout={onLogout}
        onNavigateMine={onNavigateMine}
        onNavigateHome={onNavigateHome}
      />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Mi cuenta</h1>
        <p className="mt-1 text-slate-500">
          Tus datos verificados, identidad y actividad como postor.
        </p>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="h-40 animate-pulse rounded-2xl bg-slate-200" />
            <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
          </div>
        ) : user ? (
          <div className="mt-6 space-y-4">
            {/* Resumen del cliente */}
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-extrabold text-brand-700">
                  {(user.fullName ?? '?').charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-900">
                    {user.fullName}
                  </p>
                  <p className="truncate text-sm text-slate-500">{user.email}</p>
                  {providerLabel && (
                    <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                      Verificado con {providerLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ring-1 ${KYC_BADGE[kycStatus] ?? KYC_BADGE.NOT_STARTED}`}
                >
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
                  KYC · {KYC_LABELS[kycStatus] ?? kycStatus}
                </span>
                <button
                  onClick={onNavigateMine}
                  className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white transition hover:bg-slate-800"
                >
                  Mis publicaciones →
                </button>
              </div>
            </section>

            {/* Billetera */}
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Billetera</h2>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  Yape · Plin · Tarjeta
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Garantía para pujar en subastas STANDARD. Se retienen S/ 10.00
                por puja activa: se aplican a tu pago si ganas y se liberan si
                te superan.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    Disponible
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-emerald-700">
                    {formatPrice((wallet?.availableCents ?? 0) / 100)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Saldo
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-slate-700">
                    {formatPrice((wallet?.balanceCents ?? 0) / 100)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                    Retenido en pujas
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-amber-700">
                    {formatPrice((wallet?.heldCents ?? 0) / 100)}
                  </p>
                </div>
              </div>

              <form
                className="mt-4 grid gap-3 sm:grid-cols-12"
                onSubmit={handleTopup}
              >
                <div className="sm:col-span-4">
                  <Field label="Método">
                    <div className="flex gap-1.5">
                      {['YAPE', 'PLIN', 'CARD'].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTopup((t) => ({ ...t, method: m, referenceCode: '' }))}
                          className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                            topup.method === m
                              ? 'border-brand-500 bg-brand-50 text-brand-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {m === 'CARD' ? 'Tarjeta' : m}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
                <div className="sm:col-span-3">
                  <Field label="Monto (S/)">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={topup.amount}
                      onChange={(e) =>
                        setTopup((t) => ({ ...t, amount: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-5">
                  <Field
                    label={needsReference ? 'Código de operación' : 'Tarjeta (mock)'}
                  >
                    <input
                      value={topup.referenceCode}
                      onChange={(e) =>
                        setTopup((t) => ({ ...t, referenceCode: e.target.value }))
                      }
                      placeholder={
                        needsReference
                          ? topup.method === 'PLIN'
                            ? 'Ej. 9876543210123'
                            : 'Ej. 1234567890'
                          : '4242 4242 4242 4242'
                      }
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-12">
                  <button
                    type="submit"
                    disabled={topupBusy || (needsReference && !topup.referenceCode)}
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {topupBusy
                      ? 'Verificando…'
                      : `Recargar con ${topup.method === 'CARD' ? 'tarjeta' : topup.method}`}
                  </button>
                </div>
              </form>

              {wallet?.transactions?.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Últimos movimientos
                  </h3>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {wallet.transactions.map((txn) => (
                      <li
                        key={txn.id}
                        className="flex items-center justify-between py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {txn.type === 'TOPUP'
                              ? 'Recarga'
                              : txn.type === 'APPLIED'
                                ? 'Garantía aplicada a tu pago'
                                : txn.type === 'PENALTY'
                                  ? 'Penalidad por no pagar'
                                  : txn.type === 'PAYMENT'
                                    ? 'Pago'
                                    : txn.type}
                          </p>
                          <p className="text-xs text-slate-400">
                            {txn.method}
                            {txn.provider_reference
                              ? ` · ${txn.provider_reference}`
                              : ''}
                          </p>
                        </div>
                        <span
                          className={`font-bold ${
                            txn.type === 'TOPUP'
                              ? 'text-emerald-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {txn.type === 'TOPUP' ? '+' : '−'}
                          {formatPrice(txn.amount_cents / 100)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Editar perfil */}
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="font-bold text-slate-900">Editar perfil</h2>
              <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
                <Field label="Nombre completo">
                  <input
                    className={inputClass}
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fullName: e.target.value }))
                    }
                    placeholder="Tu nombre y apellidos"
                  />
                </Field>
                <Field label="Celular">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    placeholder="+51 999 999 999"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-60"
                  >
                    {saving ? 'Guardando…' : 'Guardar cambios'}
                  </button>
                </div>
              </form>
            </section>

            {/* KYC */}
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <h2 className="font-bold text-slate-900">Verificación de identidad</h2>
              <p className="mt-1 text-sm text-slate-500">
                Necesaria para comprar o vender bienes raíces (flujo PREMIUM) y
                para retirar fondos del escrow.
              </p>
              {kycStatus === 'VERIFIED' ? (
                <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  Tu identidad ya está verificada. Gracias por la confianza.
                </p>
              ) : kycStatus === 'PENDING' ? (
                <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  Estamos revisando tu solicitud. Te avisaremos por correo.
                </p>
              ) : (
                <button
                  onClick={handleKyc}
                  disabled={kycBusy}
                  className="mt-3 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {kycBusy ? 'Enviando…' : 'Solicitar verificación'}
                </button>
              )}
            </section>

            {/* Mis pujas */}
            <section className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-900">Mis pujas</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {bids.length}
                </span>
              </div>

              {bids.length === 0 ? (
                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                  Aún no has pujado. ¡Anímate en alguna subasta activa!
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {bids.map((bid) => {
                    const photo = bid.photos?.[0];
                    return (
                      <li key={bid.id} className="flex items-center gap-3 py-3">
                        <button
                          onClick={() => onOpenDetail(bid.auction_id)}
                          className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200"
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-[10px] text-slate-300">
                              Sin foto
                            </span>
                          )}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button
                            onClick={() => onOpenDetail(bid.auction_id)}
                            className="block truncate text-left font-semibold text-slate-900 hover:text-brand-600"
                          >
                            {bid.title}
                          </button>
                          <p className="text-xs text-slate-400">
                            Tu puja: {formatPrice(bid.amount)}
                            {bid.category ? ` · ${bid.category}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          {bid.won ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              ¡Ganaste!
                            </span>
                          ) : bid.ended ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                              Finalizada
                            </span>
                          ) : bid.isLeading ? (
                            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">
                              Vas ganando
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                              Superada
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-amber-100 py-6 text-center text-sm text-slate-400">
        Martillazo — Subastas P2P · Escrow protegido · Verificación KYC
      </footer>
    </div>
  );
}

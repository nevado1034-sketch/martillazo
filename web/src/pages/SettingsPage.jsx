import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { uploadPhoto } from '../api/uploads.js';
import {
  connectPaymentGateway,
  fetchPaymentGateway,
} from '../api/auth.js';
import { mediaUrl } from '../api/config.js';

const KYC_LABEL = {
  NOT_STARTED: 'Sin iniciar',
  PENDING: 'En revisión',
  IN_REVIEW: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
};

export default function SettingsPage() {
  const {
    user,
    token,
    updateProfile,
    changePassword,
    deactivateAccount,
    submitKyc,
    requireAuth,
    setAuthOpen,
    booting,
    logout,
  } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const avatarRef = useRef(null);

  const [displayName, setDisplayName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [phoneVisibility, setPhoneVisibility] = useState('public');
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [cardholderName, setCardholderName] = useState('');
  const [cardBrand, setCardBrand] = useState('Visa');
  const [cardNumberInput, setCardNumberInput] = useState('');
  const [expiry, setExpiry] = useState('');
  const [passCurrent, setPassCurrent] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [dni, setDni] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [frontUrl, setFrontUrl] = useState('');
  const [backUrl, setBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');
  const [gatewayInfo, setGatewayInfo] = useState(null);
  const [preferredGateway, setPreferredGateway] = useState('CULQI');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (booting) return;
    if (!token) {
      requireAuth();
      setAuthOpen(true);
    }
  }, [booting, token, requireAuth, setAuthOpen]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || user.fullName || '');
    setFullName(user.fullName || '');
    setPhone(user.phone || '51');
    setEmail(user.email || '');
    setAddress(user.address || '');
    setDistrict(user.district || '');
    setCity(user.city || '');
    setPhoneVisibility(user.phoneVisibility || 'public');
    setNotifyWhatsapp(user.notifyWhatsapp !== false);
    setNotifyEmail(user.notifyEmail !== false);
    if (user.paymentGateway) setPreferredGateway(user.paymentGateway);
    const card = user.paymentCard;
    if (card) {
      setCardholderName(card.cardholderName || '');
      setCardBrand(card.brand || 'Visa');
      setCardNumberInput(card.last4 ? `•••• •••• •••• ${card.last4}` : '');
      if (card.expiryMonth && card.expiryYear) {
        setExpiry(
          `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`,
        );
      }
    }
  }, [user]);

  useEffect(() => {
    fetchPaymentGateway()
      .then(setGatewayInfo)
      .catch(() => setGatewayInfo(null));
  }, []);

  if (booting) {
    return (
      <Shell>
        <p className="text-[var(--ink-muted)]">Cargando…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <h1 className="font-display text-2xl font-bold">Configuración</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Entra para editar tu cuenta.
        </p>
        <button
          type="button"
          className="mt-6 rounded-xl bg-[var(--primary-celeste)] px-5 py-3 text-sm font-semibold text-white"
          onClick={() => setAuthOpen(true)}
        >
          Entrar
        </button>
      </Shell>
    );
  }

  const emailChanged =
    email.trim().toLowerCase() !== String(user.email).toLowerCase();

  const onCardNumberChange = (raw) => {
    const digits = raw.replace(/\D/g, '').slice(0, 19);
    const groups = digits.match(/.{1,4}/g) || [];
    setCardNumberInput(groups.join(' '));
  };

  const run = async (fn) => {
    setBusy(true);
    setError('');
    setSavedMsg('');
    try {
      await fn();
    } catch (err) {
      setError(err.message || 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = (e) => {
    e.preventDefault();
    return run(async () => {
      const digits = cardNumberInput.replace(/\D/g, '');
      const last4 = digits.slice(-4);
      const payload = {
        fullName: fullName.trim(),
        displayName: displayName.trim(),
        phone,
        email: email.trim(),
        address,
        district,
        city,
        phoneVisibility,
        notifyWhatsapp,
        notifyEmail,
        paymentGateway: preferredGateway,
      };
      if (emailChanged) payload.currentPassword = currentPassword;
      if (last4.length === 4 && cardholderName.trim() && expiry.trim()) {
        payload.paymentCard = {
          last4,
          brand: cardBrand,
          cardholderName: cardholderName.trim(),
        };
        payload.expiry = expiry.trim();
      } else if (
        (cardNumberInput || cardholderName || expiry) &&
        (last4 || cardholderName || expiry)
      ) {
        throw new Error(
          'Completa titular, últimos dígitos y vencimiento para guardar la tarjeta.',
        );
      }
      await updateProfile(payload);
      setCurrentPassword('');
      setSavedMsg('Cambios guardados correctamente.');
      push('Configuración actualizada');
    });
  };

  const savePassword = (e) => {
    e.preventDefault();
    return run(async () => {
      if (passNew !== passConfirm) {
        throw new Error('Las contraseñas nuevas no coinciden');
      }
      await changePassword({
        currentPassword: passCurrent,
        newPassword: passNew,
      });
      setPassCurrent('');
      setPassNew('');
      setPassConfirm('');
      setSavedMsg('Contraseña actualizada.');
      push('Contraseña cambiada');
    });
  };

  const onAvatar = async (file) => {
    if (!file) return;
    await run(async () => {
      const { url } = await uploadPhoto(token, file);
      await updateProfile({
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: url,
      });
      setSavedMsg('Foto de perfil actualizada.');
      push('Foto actualizada');
    });
  };

  const onKycDoc = async (file, which) => {
    if (!file) return;
    await run(async () => {
      const { url } = await uploadPhoto(token, file);
      if (which === 'front') setFrontUrl(url);
      if (which === 'back') setBackUrl(url);
      if (which === 'selfie') setSelfieUrl(url);
      push('Documento subido');
    });
  };

  const saveKyc = (e) => {
    e.preventDefault();
    return run(async () => {
      await submitKyc({
        documentType: docType,
        documentNumber: dni,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
        selfieImageUrl: selfieUrl,
      });
      setSavedMsg('Identidad enviada. Estado: en revisión (verificación admin stub).');
      push('DNI enviado a revisión');
    });
  };

  const connectGateway = () =>
    run(async () => {
      const data = await connectPaymentGateway(token, preferredGateway);
      await updateProfile({
        fullName: user.fullName,
        phone: user.phone,
        paymentGateway: preferredGateway,
      });
      setSavedMsg(data.message || 'Preferencia de pasarela guardada.');
      push('Pasarela: conectar más tarde');
    });

  const removeCard = () =>
    run(async () => {
      await updateProfile({
        fullName: user.fullName,
        phone: user.phone,
        removePaymentCard: true,
      });
      setCardNumberInput('');
      setCardholderName('');
      setExpiry('');
      setSavedMsg('Tarjeta eliminada de tu cuenta.');
      push('Tarjeta eliminada');
    });

  const closeAccount = (e) => {
    e.preventDefault();
    return run(async () => {
      await deactivateAccount({
        password: deletePassword,
        confirm: deleteConfirm,
      });
      push('Cuenta cerrada');
      logout();
      navigate('/');
    });
  };

  const avatarSrc = user.avatarUrl ? mediaUrl(user.avatarUrl) : '';

  return (
    <Shell>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--primary-celeste)]"
      >
        ← Volver
      </button>
      <h1 className="mt-3 font-display text-3xl font-bold text-[var(--text-dark)]">
        Configuración
      </h1>

      {(error || savedMsg) && (
        <div className="mt-4 space-y-2">
          {error && (
            <p className="rounded-lg bg-[var(--coral-wash)] px-3 py-2 text-sm text-[var(--coral-deep)]">
              {error}
            </p>
          )}
          {savedMsg && (
            <p className="rounded-lg bg-[var(--mint-wash)] px-3 py-2 text-sm font-medium text-[var(--primary-hover)]">
              {savedMsg}
            </p>
          )}
        </div>
      )}

      {/* Perfil */}
      <form onSubmit={saveProfile} className="mt-8 space-y-8">
        <Section title="Perfil">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-[var(--mint-wash)] ring-2 ring-[var(--primary-celeste)]/30">
              {avatarSrc ? (
                <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-[var(--primary-celeste)]">
                  {(displayName || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onAvatar(e.target.files?.[0])}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => avatarRef.current?.click()}
                className="rounded-xl border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--primary-celeste)] hover:bg-[var(--mint-wash)]"
              >
                Cambiar foto
              </button>
              <p className="mt-1 text-xs text-[var(--ink-faint)]">
                Usa el mismo cargador de fotos que al publicar.
              </p>
            </div>
          </div>
          <Field label="Nombre para mostrar (Hola…)" htmlFor="cfg-display">
            <input
              id="cfg-display"
              className="field-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </Field>
          <Field label="Nombre completo" htmlFor="cfg-fullname">
            <input
              id="cfg-fullname"
              className="field-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </Field>
          <Field label="Dirección" htmlFor="cfg-addr">
            <input
              id="cfg-addr"
              className="field-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle / referencia"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Distrito" htmlFor="cfg-dist">
              <input
                id="cfg-dist"
                className="field-input"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />
            </Field>
            <Field label="Ciudad" htmlFor="cfg-city">
              <input
                id="cfg-city"
                className="field-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Lima"
              />
            </Field>
          </div>
        </Section>

        <Section title="Contacto">
          <Field label="WhatsApp (con código 51)" htmlFor="cfg-phone">
            <input
              id="cfg-phone"
              className="field-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              required
            />
          </Field>
          <Field label="Quién ve tu teléfono" htmlFor="cfg-vis">
            <select
              id="cfg-vis"
              className="field-input"
              value={phoneVisibility}
              onChange={(e) => setPhoneVisibility(e.target.value)}
            >
              <option value="public">Público (en el anuncio)</option>
              <option value="on_offer">Solo quien oferte</option>
              <option value="nobody">Nadie (oculto)</option>
            </select>
          </Field>
          <Field label="Correo" htmlFor="cfg-email">
            <input
              id="cfg-email"
              type="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </Field>
          {emailChanged && (
            <Field
              label="Contraseña actual (para cambiar el correo)"
              htmlFor="cfg-pass"
            >
              <input
                id="cfg-pass"
                type="password"
                className="field-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </Field>
          )}
        </Section>

        <Section title="Notificaciones">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyWhatsapp}
              onChange={(e) => setNotifyWhatsapp(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary-celeste)]"
            />
            Avisos por WhatsApp
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.checked)}
              className="h-4 w-4 accent-[var(--primary-celeste)]"
            />
            Avisos por correo
          </label>
          <p className="text-xs text-[var(--ink-faint)]">
            Preferencias guardadas en tu perfil. El envío real depende de SMTP /
            WhatsApp Business en producción.
          </p>
        </Section>

        <Section title="Tarjeta (débito / crédito)">
          <p className="text-xs leading-relaxed text-[var(--ink-muted)]">
            Por seguridad <strong>no guardamos</strong> el número completo ni el
            CVV. Solo marca, últimos 4 dígitos, vencimiento y titular. El cobro
            real llega con Culqi / Niubiz / Mercado Pago más adelante.
          </p>
          {user.paymentCard && (
            <div className="rounded-xl bg-[var(--mint-wash)] px-3 py-2.5 text-sm">
              Guardada: {user.paymentCard.brand} •••• {user.paymentCard.last4}
              {user.paymentCard.expiryMonth
                ? ` · ${String(user.paymentCard.expiryMonth).padStart(2, '0')}/${String(user.paymentCard.expiryYear).slice(-2)}`
                : ''}
            </div>
          )}
          <Field label="Nombre del titular" htmlFor="cfg-holder">
            <input
              id="cfg-holder"
              className="field-input"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              autoComplete="cc-name"
            />
          </Field>
          <Field label="Marca" htmlFor="cfg-brand">
            <select
              id="cfg-brand"
              className="field-input"
              value={cardBrand}
              onChange={(e) => setCardBrand(e.target.value)}
            >
              <option>Visa</option>
              <option>Mastercard</option>
              <option>Amex</option>
              <option>Otro</option>
            </select>
          </Field>
          <Field
            label="Número (enmascarado; solo se guardan los últimos 4)"
            htmlFor="cfg-pan"
          >
            <input
              id="cfg-pan"
              className="field-input tracking-wider"
              value={cardNumberInput}
              onChange={(e) => onCardNumberChange(e.target.value)}
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="•••• •••• •••• 1234"
            />
          </Field>
          <Field label="Vencimiento (MM/AA)" htmlFor="cfg-exp">
            <input
              id="cfg-exp"
              className="field-input"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="12/28"
              autoComplete="cc-exp"
            />
          </Field>
          <p className="text-xs text-[var(--ink-faint)]">
            No pedimos CVV: no se almacena en PulgasYa.
          </p>
          {user.paymentCard && (
            <button
              type="button"
              onClick={removeCard}
              disabled={busy}
              className="text-sm font-semibold text-[var(--cta-orange)] hover:underline disabled:opacity-50"
            >
              Quitar tarjeta guardada
            </button>
          )}
        </Section>

        <Section title="Pasarela de pago (stub)">
          <p className="text-xs text-[var(--ink-muted)]">
            {gatewayInfo?.note ||
              'No se realizan cobros. Conecta credenciales en el servidor cuando esté listo.'}
          </p>
          <Field label="Proveedor preferido" htmlFor="cfg-gw">
            <select
              id="cfg-gw"
              className="field-input"
              value={preferredGateway}
              onChange={(e) => setPreferredGateway(e.target.value)}
            >
              <option value="CULQI">Culqi</option>
              <option value="NIUBIZ">Niubiz</option>
              <option value="MERCADOPAGO">Mercado Pago</option>
            </select>
          </Field>
          <button
            type="button"
            disabled={busy}
            onClick={connectGateway}
            className="rounded-xl border border-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-celeste)] hover:bg-[var(--mint-wash)] disabled:opacity-50"
          >
            Guardar preferencia · conectar más tarde
          </button>
        </Section>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-[var(--cta-orange)] py-3.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {busy ? 'Guardando…' : 'Guardar cambios de perfil'}
        </button>
      </form>

      {/* Contraseña */}
      <form onSubmit={savePassword} className="mt-10">
        <Section title="Cambiar contraseña">
          <Field label="Contraseña actual" htmlFor="pw-cur">
            <input
              id="pw-cur"
              type="password"
              className="field-input"
              value={passCurrent}
              onChange={(e) => setPassCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="Nueva contraseña" htmlFor="pw-new">
            <input
              id="pw-new"
              type="password"
              className="field-input"
              value={passNew}
              onChange={(e) => setPassNew(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirmar nueva" htmlFor="pw-conf">
            <input
              id="pw-conf"
              type="password"
              className="field-input"
              value={passConfirm}
              onChange={(e) => setPassConfirm(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Actualizar contraseña
          </button>
          <p className="text-xs text-[var(--ink-faint)]">
            ¿Olvidaste tu contraseña?{' '}
            <Link to="/recuperar" className="text-[var(--primary-celeste)] hover:underline">
              Recuperar por correo
            </Link>
          </p>
        </Section>
      </form>

      {/* DNI */}
      <form onSubmit={saveKyc} className="mt-10">
        <Section title="Verificación de identidad (DNI)">
          <p className="text-xs text-[var(--ink-muted)]">
            Estado:{' '}
            <strong>{KYC_LABEL[user.kycStatus] || user.kycStatus}</strong>
            . La aprobación admin es stub en este MVP.
          </p>
          <Field label="Tipo" htmlFor="kyc-type">
            <select
              id="kyc-type"
              className="field-input"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
              <option value="PASAPORTE">Pasaporte</option>
            </select>
          </Field>
          <Field label="Número" htmlFor="kyc-num">
            <input
              id="kyc-num"
              className="field-input"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              required
              placeholder="8 dígitos (DNI)"
            />
          </Field>
          <DocUpload
            label="Foto frente"
            onFile={(f) => onKycDoc(f, 'front')}
            done={Boolean(frontUrl)}
          />
          <DocUpload
            label="Foto reverso"
            onFile={(f) => onKycDoc(f, 'back')}
            done={Boolean(backUrl)}
          />
          <DocUpload
            label="Selfie"
            onFile={(f) => onKycDoc(f, 'selfie')}
            done={Boolean(selfieUrl)}
          />
          <button
            type="submit"
            disabled={busy || user.kycStatus === 'VERIFIED'}
            className="rounded-xl bg-[var(--primary-celeste)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar a revisión
          </button>
        </Section>
      </form>

      {/* Cerrar cuenta */}
      <form onSubmit={closeAccount} className="mt-10 mb-6">
        <Section title="Cerrar cuenta / borrar datos" danger>
          <p className="text-xs text-[var(--ink-muted)]">
            Soft-delete: desactivamos tu cuenta, archivamos anuncios activos y
            anonimizamos datos personales. Escribe <strong>ELIMINAR</strong> para
            confirmar.
          </p>
          <Field label="Contraseña" htmlFor="del-pass">
            <input
              id="del-pass"
              type="password"
              className="field-input"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              required
            />
          </Field>
          <Field label='Confirmación (escribe ELIMINAR)' htmlFor="del-conf">
            <input
              id="del-conf"
              className="field-input"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              required
            />
          </Field>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[var(--cta-orange)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Cerrar mi cuenta
          </button>
        </Section>
      </form>

      <p className="pb-8 text-center text-xs text-[var(--ink-faint)]">
        <Link to="/mis-anuncios" className="text-[var(--primary-celeste)] hover:underline">
          Mis anuncios
        </Link>
        {' · '}
        <Link to="/mis-ventas" className="text-[var(--primary-celeste)] hover:underline">
          Mis ventas
        </Link>
        {' · '}
        <Link to="/ayuda" className="text-[var(--primary-celeste)] hover:underline">
          Ayuda
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-3 py-6 sm:px-4 sm:py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function Section({ title, children, danger }) {
  return (
    <section
      className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${
        danger
          ? 'border-[var(--cta-orange)]/40 bg-[var(--coral-wash)]/40'
          : 'border-[var(--line)] bg-white'
      }`}
    >
      <h2
        className={`font-display text-lg font-bold ${
          danger ? 'text-[var(--cta-orange)]' : 'text-[var(--primary-celeste)]'
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-[var(--ink)]">
        {label}
      </label>
      {children}
    </div>
  );
}

function DocUpload({ label, onFile, done }) {
  const ref = useRef(null);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">
        {label}{' '}
        {done && (
          <span className="font-semibold text-[var(--primary-celeste)]">✓</span>
        )}
      </span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs font-semibold"
      >
        Subir
      </button>
    </div>
  );
}

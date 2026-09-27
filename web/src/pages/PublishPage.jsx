import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { uploadPhoto } from '../api/uploads.js';
import {
  PRODUCT_CATEGORIES,
  SERVICE_CATEGORIES,
} from '../data/mockListings.js';

const STEPS = ['tipo', 'datos', 'listo'];

export default function PublishPage() {
  const [params] = useSearchParams();
  const initialTipo =
    params.get('tipo') === 'servicio' || params.get('tipo') === 'producto'
      ? params.get('tipo')
      : null;

  const { publishListing } = useMarketplace();
  const { token, user, requireAuth } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(initialTipo ? 'datos' : 'tipo');
  const [tipo, setTipo] = useState(initialTipo);
  const [createdId, setCreatedId] = useState(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [condition, setCondition] = useState('Buen estado');
  const [negotiable, setNegotiable] = useState(true);
  const [shipping, setShipping] = useState('persona');
  const [priceMode, setPriceMode] = useState('hora');
  const [zone, setZone] = useState('');
  const [availableToday, setAvailableToday] = useState(false);
  const [busy, setBusy] = useState(false);

  const categories = tipo === 'servicio' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;
  const stepIndex = STEPS.indexOf(step);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !price || !location.trim() || !category) return false;
    const n = Number(price);
    return Number.isFinite(n) && n > 0;
  }, [title, price, location, category]);

  const ensureAuth = () => requireAuth('publish');

  const chooseTipo = (t) => {
    if (!ensureAuth()) return;
    setTipo(t);
    setCategory('');
    setStep('datos');
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!ensureAuth() || !token) return;
    if (!user?.phone) {
      push('Añade tu WhatsApp en el perfil al registrarte para publicar.');
      return;
    }

    setBusy(true);
    try {
      let images = [];
      if (photoFile) {
        const uploaded = await uploadPhoto(token, photoFile);
        if (uploaded?.url) images = [uploaded.url];
      }

      const base = {
        type: tipo,
        title: title.trim(),
        description: description.trim() || 'Sin descripción adicional.',
        price: Number(price),
        category,
        location: location.trim(),
        images,
      };

      const payload =
        tipo === 'servicio'
          ? {
              ...base,
              priceMode,
              zone: zone.trim() || location.trim(),
              availableToday,
            }
          : {
              ...base,
              condition,
              negotiable,
              shipping,
            };

      const created = await publishListing(payload);
      setCreatedId(created.id);
      setStep('listo');
      push('Anuncio publicado');
    } catch (err) {
      push(err.message || 'No se pudo publicar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
          Publicar · paso {Math.min(stepIndex + 1, 2)} de 2
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">
          {step === 'tipo' && '¿Qué quieres publicar?'}
          {step === 'datos' &&
            (tipo === 'servicio' ? 'Ofrece tu servicio' : 'Vende tu producto')}
          {step === 'listo' && '¡Listo!'}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {step === 'tipo' &&
            'Elige pronto el tipo: productos y servicios tienen campos distintos. Requiere cuenta.'}
          {step === 'datos' && 'Solo lo esencial. Sube una foto real del anuncio.'}
          {step === 'listo' && 'Tu anuncio ya está en la base de datos de PulgasYa.'}
        </p>

        <div className="mt-4 flex gap-2">
          {STEPS.slice(0, 2).map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition ${
                i <= stepIndex ? 'bg-[var(--brand)]' : 'bg-[var(--line)]'
              }`}
            />
          ))}
        </div>

        {step === 'tipo' && (
          <div className="mt-8 grid gap-4">
            {!token && (
              <button
                type="button"
                onClick={() => ensureAuth()}
                className="rounded-xl border border-dashed border-[var(--brand)] bg-[var(--mint-wash)] px-4 py-3 text-left text-sm text-[var(--brand-deep)]"
              >
                Primero inicia sesión o crea una cuenta →
              </button>
            )}
            <button
              type="button"
              onClick={() => chooseTipo('producto')}
              className="rounded-2xl border border-[var(--line)] bg-[var(--mint-wash)] p-6 text-left transition hover:border-[var(--brand)] hover:shadow-md"
            >
              <span className="font-display text-xl font-bold text-[var(--ink)]">
                Producto
              </span>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Segunda mano: precio en S/, estado y entrega.
              </p>
            </button>
            <button
              type="button"
              onClick={() => chooseTipo('servicio')}
              className="rounded-2xl border border-[var(--line)] bg-[var(--coral-wash)] p-6 text-left transition hover:border-[var(--coral)] hover:shadow-md"
            >
              <span className="font-display text-xl font-bold text-[var(--ink)]">
                Servicio
              </span>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                S/ por hora, desde o fijo — zona y disponibilidad.
              </p>
            </button>
          </div>
        )}

        {step === 'datos' && (
          <form onSubmit={submit} className="mt-8 space-y-4 animate-hero-in">
            <button
              type="button"
              className="text-sm font-medium text-[var(--brand)] hover:underline"
              onClick={() => setStep('tipo')}
            >
              ← Cambiar a {tipo === 'servicio' ? 'producto' : 'servicio'}
            </button>

            <Field label="Foto" htmlFor="pub-photo">
              <input
                id="pub-photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPickPhoto}
                className="block w-full text-sm text-[var(--ink-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--mint-soft)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--brand-deep)]"
              />
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt=""
                  className="mt-3 h-40 w-full rounded-xl object-cover border border-[var(--line)]"
                />
              )}
            </Field>

            <Field label="Título" htmlFor="pub-title">
              <input
                id="pub-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={80}
                placeholder={
                  tipo === 'servicio'
                    ? 'Ej. Limpieza a domicilio'
                    : 'Ej. Sofá 3 plazas'
                }
                className="field-input"
              />
            </Field>

            <Field label="Categoría" htmlFor="pub-cat">
              <select
                id="pub-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="field-input"
              >
                <option value="">Selecciona…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            {tipo === 'servicio' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo de tarifa" htmlFor="pub-mode">
                    <select
                      id="pub-mode"
                      value={priceMode}
                      onChange={(e) => setPriceMode(e.target.value)}
                      className="field-input"
                    >
                      <option value="hora">S/ por hora</option>
                      <option value="desde">Desde</option>
                      <option value="fijo">Precio fijo</option>
                    </select>
                  </Field>
                  <Field label="Importe (S/)" htmlFor="pub-price">
                    <input
                      id="pub-price"
                      type="number"
                      min="1"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className="field-input"
                    />
                  </Field>
                </div>
                <Field label="Zona de cobertura" htmlFor="pub-zone">
                  <input
                    id="pub-zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    placeholder="Ej. Hasta 10 km / online"
                    className="field-input"
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={availableToday}
                    onChange={(e) => setAvailableToday(e.target.checked)}
                    className="rounded border-[var(--line)]"
                  />
                  Disponible hoy
                </label>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio (S/)" htmlFor="pub-price">
                    <input
                      id="pub-price"
                      type="number"
                      min="1"
                      step="1"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      className="field-input"
                    />
                  </Field>
                  <Field label="Estado" htmlFor="pub-cond">
                    <select
                      id="pub-cond"
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="field-input"
                    >
                      <option>Como nuevo</option>
                      <option>Buen estado</option>
                      <option>Aceptable</option>
                    </select>
                  </Field>
                </div>
                <Field label="Entrega" htmlFor="pub-ship">
                  <select
                    id="pub-ship"
                    value={shipping}
                    onChange={(e) => setShipping(e.target.value)}
                    className="field-input"
                  >
                    <option value="persona">Sólo en persona</option>
                    <option value="envio">Envío / delivery</option>
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={negotiable}
                    onChange={(e) => setNegotiable(e.target.checked)}
                  />
                  Precio negociable
                </label>
              </>
            )}

            <Field label="Ubicación" htmlFor="pub-loc">
              <input
                id="pub-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="Distrito o ciudad"
                className="field-input"
              />
            </Field>

            <Field label="Descripción" htmlFor="pub-desc">
              <textarea
                id="pub-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="field-input resize-none"
                placeholder="Detalles útiles para quien te contacte"
              />
            </Field>

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="w-full rounded-xl bg-[var(--cta-orange)] py-3.5 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Publicando…' : 'Publicar anuncio'}
            </button>
          </form>
        )}

        {step === 'listo' && (
          <div className="mt-10 space-y-4 animate-hero-in text-center">
            <p className="text-[var(--ink-muted)]">
              Ya puedes ver la ficha y recibir propuestas de precio + WhatsApp.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to={`/anuncio/${createdId}`}
                className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
              >
                Ver anuncio
              </Link>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
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

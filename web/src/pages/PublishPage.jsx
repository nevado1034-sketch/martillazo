import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
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
  const [imageUrl, setImageUrl] = useState('');
  // product
  const [condition, setCondition] = useState('Buen estado');
  const [negotiable, setNegotiable] = useState(true);
  const [shipping, setShipping] = useState('persona');
  // service
  const [priceMode, setPriceMode] = useState('hora');
  const [zone, setZone] = useState('');
  const [availableToday, setAvailableToday] = useState(false);

  const categories = tipo === 'servicio' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;

  const stepIndex = STEPS.indexOf(step);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !price || !location.trim() || !category) return false;
    const n = Number(price);
    return Number.isFinite(n) && n > 0;
  }, [title, price, location, category]);

  const chooseTipo = (t) => {
    setTipo(t);
    setCategory('');
    setStep('datos');
  };

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const base = {
      type: tipo,
      title: title.trim(),
      description: description.trim() || 'Sin descripción adicional.',
      price: Number(price),
      currency: 'EUR',
      category,
      location: location.trim(),
      images: imageUrl.trim()
        ? [imageUrl.trim()]
        : [
            tipo === 'servicio'
              ? 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80'
              : 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80',
          ],
    };

    const listing =
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

    const created = publishListing(listing);
    setCreatedId(created.id);
    setStep('listo');
    push('Anuncio publicado');
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
            'Elige pronto el tipo: productos y servicios tienen campos distintos.'}
          {step === 'datos' && 'Solo lo esencial. Puedes mejorar el anuncio después.'}
          {step === 'listo' && 'Tu anuncio ya está visible en PulgasYa (MVP local).'}
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
            <button
              type="button"
              onClick={() => chooseTipo('producto')}
              className="rounded-2xl border border-[var(--line)] bg-[var(--mint-wash)] p-6 text-left transition hover:border-[var(--brand)] hover:shadow-md"
            >
              <span className="font-display text-xl font-bold text-[var(--ink)]">
                Producto
              </span>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Segunda mano: precio fijo, estado y entrega.
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
                €/hora, desde o fijo — zona y disponibilidad.
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
                      <option value="hora">Por hora</option>
                      <option value="desde">Desde</option>
                      <option value="fijo">Precio fijo</option>
                    </select>
                  </Field>
                  <Field label="Importe (€)" htmlFor="pub-price">
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
                  <Field label="Precio (€)" htmlFor="pub-price">
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
                    <option value="envio">Envío disponible</option>
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
                placeholder="Ciudad o barrio"
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

            <Field label="URL de foto (opcional en MVP)" htmlFor="pub-img">
              <input
                id="pub-img"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://…"
                className="field-input"
              />
            </Field>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-xl bg-[var(--coral)] py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--coral-deep)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Publicar anuncio
            </button>
          </form>
        )}

        {step === 'listo' && (
          <div className="mt-10 space-y-4 animate-hero-in text-center">
            <p className="text-[var(--ink-muted)]">
              Ya puedes ver la ficha y recibir propuestas de precio.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                to={`/anuncio/${createdId}`}
                className="rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white"
              >
                Ver anuncio
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold"
              >
                Ir al inicio
              </Link>
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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import SiteHeader from '../components/layout/SiteHeader.jsx';
import SiteFooter from '../components/layout/SiteFooter.jsx';
import PhotoPicker from '../components/publish/PhotoPicker.jsx';
import { useMarketplace } from '../store/MarketplaceContext.jsx';
import { useAuth } from '../store/AuthContext.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { uploadPhoto } from '../api/uploads.js';
import { fetchListing } from '../api/listings.js';
import { mediaUrl } from '../api/config.js';
import {
  CONDITIONS,
  categoriesForType,
  getCategoryDef,
  getCondition,
} from '../data/taxonomy.js';

const STEPS = ['tipo', 'datos', 'listo'];

export default function PublishPage() {
  const [params] = useSearchParams();
  const editId = params.get('editar');
  const isEdit = Boolean(editId);
  const initialTipo =
    params.get('tipo') === 'servicio' || params.get('tipo') === 'producto'
      ? params.get('tipo')
      : null;

  const { publishListing, editListing } = useMarketplace();
  const { token, user, requireAuth } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(
    isEdit || initialTipo ? 'datos' : 'tipo',
  );
  const [tipo, setTipo] = useState(initialTipo);
  const [createdId, setCreatedId] = useState(isEdit ? editId : null);
  const [loadingListing, setLoadingListing] = useState(isEdit);
  const [loadError, setLoadError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [attributes, setAttributes] = useState({});
  /** Hasta 8 fotos: { file } para nuevas y { url } para las ya guardadas. */
  const [photoItems, setPhotoItems] = useState([]);
  const [photoError, setPhotoError] = useState('');
  const lastNewPhoto = [...photoItems].reverse().find((item) => item.file);
  const photoFile = lastNewPhoto?.file ?? null;
  const photoPreview = lastNewPhoto?.preview ?? '';
  const [condition, setCondition] = useState('bueno');
  const [negotiable, setNegotiable] = useState(true);
  const [shipping, setShipping] = useState('persona');
  const [priceMode, setPriceMode] = useState('hora');
  const [zone, setZone] = useState('');
  const [availableToday, setAvailableToday] = useState(false);
  const [busy, setBusy] = useState(false);

  // Cargar el anuncio a editar (solo el dueño).
  useEffect(() => {
    if (!editId) return undefined;
    if (!token) {
      setLoadingListing(false);
      setLoadError('Inicia sesión para editar tu anuncio.');
      return undefined;
    }
    let cancelled = false;
    setLoadingListing(true);
    setLoadError('');
    fetchListing(editId, token)
      .then((data) => {
        if (cancelled) return;
        if (user && data?.seller?.id && data.seller.id !== user.id) {
          setLoadError('Este anuncio no es tuyo.');
          return;
        }
        setTipo(data.type);
        setTitle(data.title || '');
        setDescription(
          data.description === 'Sin descripción adicional.'
            ? ''
            : data.description || '',
        );
        setPrice(data.price != null ? String(data.price) : '');
        setLocation(data.location || '');
        setCategory(data.category || '');
        setSubcategory(data.subcategory || '');
        setAttributes(
          data.attributes &&
            typeof data.attributes === 'object' &&
            !Array.isArray(data.attributes)
            ? data.attributes
            : {},
        );
        setCondition(getCondition(data.condition)?.value || 'bueno');
        setNegotiable(data.negotiable !== false);
        setShipping(data.shipping === 'envio' ? 'envio' : 'persona');
        setPriceMode(
          ['hora', 'desde', 'fijo'].includes(data.priceMode)
            ? data.priceMode
            : 'hora',
        );
        setZone(data.zone || '');
        setAvailableToday(Boolean(data.availableToday));
        setPhotoItems(
          (data.images || []).slice(0, 8).map((url) => ({
            url,
            preview: mediaUrl(url),
          })),
        );
        setCreatedId(data.id);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'No se pudo cargar el anuncio.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
    // Solo al cambiar de anuncio o de sesión.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, token]);

  const categoryOptions = categoriesForType(
    tipo === 'servicio' ? 'servicio' : 'producto',
  );
  const categoryDef = getCategoryDef(
    category,
    tipo === 'servicio' ? 'servicio' : 'producto',
  );
  const subcategories = categoryDef?.subcategories ?? [];
  const needsSubcategory = subcategories.length > 0;
  const filterGroups = categoryDef?.filters ?? [];
  const stepIndex = STEPS.indexOf(step);

  const canSubmit = useMemo(() => {
    if (!title.trim() || !price || !location.trim() || !category) return false;
    if (needsSubcategory && !subcategory) return false;
    const n = Number(price);
    return Number.isFinite(n) && n > 0;
  }, [title, price, location, category, needsSubcategory, subcategory]);

  const ensureAuth = () => requireAuth('publish');

  const chooseTipo = (t) => {
    if (!ensureAuth()) return;
    setTipo(t);
    setCategory('');
    setSubcategory('');
    setAttributes({});
    setStep('datos');
  };

  const changeCategory = (value) => {
    setCategory(value);
    setSubcategory('');
    setAttributes({});
  };

  const changeAttribute = (key, value) => {
    setAttributes((prev) => {
      const next = { ...prev };
      if (!value) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const clearPhoto = () => {
    photoItems.forEach((item) => {
      if (item.preview?.startsWith('blob:')) URL.revokeObjectURL(item.preview);
    });
    setPhotoItems([]);
    setPhotoError('');
  };

  const removePhotoAt = (idx) => {
    setPhotoItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(idx, 1);
      if (removed?.preview?.startsWith('blob:')) {
        URL.revokeObjectURL(removed.preview);
      }
      return next;
    });
  };

  /** «Quitar» del selector: borra solo la última foto nueva (o todas si no hay). */
  const clearPickerPhoto = () => {
    const lastNewIdx = photoItems.map((item) => Boolean(item.file)).lastIndexOf(true);
    if (lastNewIdx >= 0) removePhotoAt(lastNewIdx);
    else clearPhoto();
  };

  const onPickPhoto = (file, errMsg) => {
    if (errMsg) {
      setPhotoError(errMsg);
      return;
    }
    if (!file) return;
    setPhotoError('');
    setPhotoItems((prev) => {
      if (prev.length >= 8) {
        setPhotoError('Máximo 8 fotos por anuncio.');
        return prev;
      }
      return [...prev, { file, preview: URL.createObjectURL(file) }];
    });
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
    setPhotoError('');
    try {
      const images = [];
      try {
        for (const item of photoItems) {
          if (item.file) {
            const uploaded = await uploadPhoto(token, item.file);
            if (uploaded?.url) images.push(uploaded.url);
          } else if (item.url) {
            images.push(item.url);
          }
        }
      } catch (upErr) {
        setPhotoError(upErr.message || 'No se pudo subir la foto. Revisa la conexión e inténtalo de nuevo.');
        push(upErr.message || 'Error al subir la foto');
        setBusy(false);
        return;
      }

      const cleanAttributes = Object.fromEntries(
        Object.entries(attributes).filter(([, value]) => Boolean(value)),
      );
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
              subcategory: subcategory || undefined,
              attributes: cleanAttributes,
              condition,
              negotiable,
              shipping,
            };

      if (isEdit) {
        const updated = await editListing(editId, payload);
        setCreatedId(updated.id);
        setStep('listo');
        push('Anuncio actualizado');
      } else {
        const created = await publishListing(payload);
        setCreatedId(created.id);
        setStep('listo');
        push('Anuncio publicado');
      }
    } catch (err) {
      push(err.message || (isEdit ? 'No se pudo actualizar' : 'No se pudo publicar'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-xl flex-1 px-3 py-6 sm:px-4 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
          {isEdit
            ? 'Editar anuncio'
            : `Publicar · paso ${Math.min(stepIndex + 1, 2)} de 2`}
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold text-[var(--ink)]">
          {step === 'tipo' && '¿Qué quieres publicar?'}
          {step === 'datos' &&
            (tipo === 'servicio'
              ? isEdit
                ? 'Edita tu servicio'
                : 'Ofrece tu servicio'
              : isEdit
                ? 'Edita tu producto'
                : 'Vende tu producto')}
          {step === 'listo' && (isEdit ? '¡Anuncio actualizado!' : '¡Listo!')}
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {step === 'tipo' &&
            'Elige pronto el tipo: productos y servicios tienen campos distintos. Requiere cuenta.'}
          {step === 'datos' &&
            (isEdit
              ? 'Cambia lo que necesites. Las fotos que no quites se conservan.'
              : 'Solo lo esencial. Sube una foto real del anuncio.')}
          {step === 'listo' &&
            (isEdit
              ? 'Los cambios ya se ven en tu anuncio.'
              : 'Tu anuncio ya está en la base de datos de PulgasYa.')}
        </p>

        {!isEdit && (
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
        )}

        {isEdit && loadingListing && (
          <p className="mt-8 text-sm text-[var(--ink-muted)]">Cargando anuncio…</p>
        )}

        {isEdit && !loadingListing && loadError && (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-6">
            <p className="text-sm text-[var(--coral-deep)]">{loadError}</p>
            <Link
              to="/mis-anuncios"
              className="mt-4 inline-block rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Ir a Mis anuncios
            </Link>
          </div>
        )}

        {step === 'tipo' && !isEdit && (
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

        {step === 'datos' && !loadingListing && !loadError && (
          <form onSubmit={submit} className="mt-8 space-y-4 animate-hero-in">
            {!isEdit && (
              <button
                type="button"
                className="text-sm font-medium text-[var(--brand)] hover:underline"
                onClick={() => setStep('tipo')}
              >
                ← Cambiar tipo de anuncio
              </button>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-[var(--ink)]">
                Fotos (hasta 8 — galería en la ficha)
              </p>
              {photoItems.length > 0 && (
                <ul className="mb-3 flex flex-wrap gap-2">
                  {photoItems.map((item, i) => (
                    <li
                      key={`${i}-${item.url || item.preview}`}
                      className="relative"
                    >
                      <img
                        src={item.preview}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover ring-1 ring-[var(--line)]"
                      />
                      <button
                        type="button"
                        onClick={() => removePhotoAt(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cta-orange)] text-xs font-bold text-white"
                        aria-label="Quitar foto"
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <PhotoPicker
                file={photoFile}
                previewUrl={photoPreview}
                error={photoError}
                onPick={onPickPhoto}
                onClear={clearPickerPhoto}
              />
            </div>

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
                onChange={(e) => changeCategory(e.target.value)}
                required
                className="field-input"
              >
                <option value="">Selecciona…</option>
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            {subcategories.length > 0 && (
              <Field label="Subcategoría" htmlFor="pub-sub">
                <select
                  id="pub-sub"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  required
                  className="field-input"
                >
                  <option value="">Selecciona…</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {filterGroups.length > 0 && (
              <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  Detalles de {categoryDef.label}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Ayudan a que más personas encuentren tu anuncio con los filtros.
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {filterGroups.map((group) => (
                    <Field
                      key={group.key}
                      label={group.label}
                      htmlFor={`pub-attr-${group.key}`}
                    >
                      <select
                        id={`pub-attr-${group.key}`}
                        value={attributes[group.key] || ''}
                        onChange={(e) =>
                          changeAttribute(group.key, e.target.value)
                        }
                        className="field-input"
                      >
                        <option value="">Cualquiera</option>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
              </div>
            )}

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
                      min="0.01"
                      step="0.01"
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
                      min="0.01"
                      step="0.01"
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
                      {CONDITIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label} — {item.hint}
                        </option>
                      ))}
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
              {busy
                ? isEdit
                  ? 'Guardando…'
                  : 'Publicando…'
                : isEdit
                  ? 'Guardar cambios'
                  : 'Publicar anuncio'}
            </button>
          </form>
        )}

        {step === 'listo' && (
          <div className="mt-10 space-y-4 animate-hero-in text-center">
            <p className="text-[var(--ink-muted)]">
              {isEdit
                ? 'Tus cambios ya están visibles en el anuncio.'
                : 'Ya puedes ver la ficha y recibir propuestas de precio + WhatsApp.'}
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
                onClick={() => navigate(isEdit ? '/mis-anuncios' : '/')}
                className="rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-semibold"
              >
                {isEdit ? 'Volver a Mis anuncios' : 'Ir al inicio'}
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

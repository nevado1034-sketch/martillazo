/**
 * Fuente única de taxonomía de PulgasYa.
 *
 * Categorías, subcategorías, marcas/tipos/aros y filtros contextuales.
 * Los `value` son slugs estables (sin acentos) que se guardan en PostgreSQL;
 * los `label` son solo para mostrar en la interfaz.
 */

const opt = (value, label) => ({ value, label });

/* ------------------------------------------------------------------ */
/* Estado del producto                                                 */
/* ------------------------------------------------------------------ */

export const CONDITIONS = [
  { value: 'nuevo', label: 'Nuevo', hint: 'Con etiqueta' },
  { value: 'como-nuevo', label: 'Como nuevo', hint: 'Sin uso visible' },
  { value: 'bueno', label: 'Bueno', hint: 'Con detalles' },
  { value: 'lo-ha-dado-todo', label: 'Lo ha dado todo', hint: 'Desgaste visible' },
  { value: 'no-funciona', label: 'No funciona', hint: 'Para reparar' },
];

/** Compatibilidad con anuncios antiguos guardados como texto libre. */
export const CONDITION_ALIASES = {
  nuevo: 'nuevo',
  'con etiqueta': 'nuevo',
  'como nuevo': 'como-nuevo',
  'como-nuevo': 'como-nuevo',
  'sin uso visible': 'como-nuevo',
  bueno: 'bueno',
  'buen estado': 'bueno',
  'con detalles': 'bueno',
  aceptable: 'lo-ha-dado-todo',
  regular: 'lo-ha-dado-todo',
  'lo ha dado todo': 'lo-ha-dado-todo',
  'lo-ha-dado-todo': 'lo-ha-dado-todo',
  'desgaste visible': 'lo-ha-dado-todo',
  'no funciona': 'no-funciona',
  'no-funciona': 'no-funciona',
  'para reparar': 'no-funciona',
};

/* ------------------------------------------------------------------ */
/* Fecha y precio                                                      */
/* ------------------------------------------------------------------ */

export const DATE_RANGES = [
  { value: '24h', label: 'Últimas 24 horas', hours: 24 },
  { value: '7d', label: 'Últimos 7 días', hours: 24 * 7 },
  { value: '30d', label: 'Últimos 30 días', hours: 24 * 30 },
  { value: 'all', label: 'Todos', hours: null },
];

export const PRICE_RANGES = [
  { id: '0-100', label: 'Hasta S/ 100', min: 0, max: 100 },
  { id: '100-500', label: 'S/ 100 – S/ 500', min: 100, max: 500 },
  { id: '500-1000', label: 'S/ 500 – S/ 1,000', min: 500, max: 1000 },
  { id: '1000-3000', label: 'S/ 1,000 – S/ 3,000', min: 1000, max: 3000 },
  { id: '3000+', label: 'Más de S/ 3,000', min: 3000, max: null },
];

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
];

/* ------------------------------------------------------------------ */
/* Listas de marcas y atributos                                        */
/* ------------------------------------------------------------------ */

const TECH_BRANDS = [
  opt('apple', 'Apple'),
  opt('samsung', 'Samsung'),
  opt('sony', 'Sony'),
  opt('xiaomi', 'Xiaomi'),
  opt('hp', 'HP'),
  opt('lenovo', 'Lenovo'),
  opt('nintendo', 'Nintendo'),
  opt('playstation', 'PlayStation'),
  opt('xbox', 'Xbox'),
  opt('jbl', 'JBL'),
  opt('lg', 'LG'),
  opt('motorola', 'Motorola'),
  opt('asus', 'Asus'),
  opt('acer', 'Acer'),
  opt('canon', 'Canon'),
  opt('nikon', 'Nikon'),
  opt('dji', 'DJI'),
  opt('gopro', 'GoPro'),
  opt('otras', 'Otras'),
];

const BIKE_BRANDS = [
  opt('oxford', 'Oxford'),
  opt('trek', 'Trek'),
  opt('bianchi', 'Bianchi'),
  opt('merida', 'Merida'),
  opt('jamis', 'Jamis'),
  opt('scott', 'Scott'),
  opt('raleigh', 'Raleigh'),
  opt('silverback', 'Silverback'),
  opt('mongoose', 'Mongoose'),
  opt('radost', 'Radost'),
  opt('chillafish', 'Chillafish'),
  opt('upland', 'Upland'),
  opt('bebeglo', 'Bebeglo'),
  opt('shark', 'Shark'),
  opt('lahsen', 'Lahsen'),
  opt('faucon', 'Faucon'),
  opt('wolfking', 'Wolfking'),
  opt('phoenix', 'Phoenix'),
  opt('sng', 'SNG'),
  opt('totem', 'Totem'),
  opt('otras', 'Otras'),
];

const BIKE_TYPES = [
  opt('bmx', 'BMX'),
  opt('enduro', 'Enduro'),
  opt('ruta', 'Ruta'),
  opt('mtb', 'MTB / Montaña'),
  opt('paseo-vintage', 'Paseo / Vintage'),
  opt('infantil', 'Infantil'),
  opt('urbana', 'Urbana'),
  opt('equilibrio', 'Equilibrio'),
  opt('plegable', 'Plegable'),
  opt('pistera', 'Pistera'),
  opt('triciclo', 'Triciclo'),
];

const BIKE_WHEELS = [
  opt('12', 'Aro 12'),
  opt('16', 'Aro 16'),
  opt('18', 'Aro 18'),
  opt('20', 'Aro 20'),
  opt('24', 'Aro 24'),
  opt('26', 'Aro 26'),
  opt('27.5', 'Aro 27.5'),
  opt('29', 'Aro 29'),
];

const FASHION_SIZES = [
  opt('xs', 'XS'),
  opt('s', 'S'),
  opt('m', 'M'),
  opt('l', 'L'),
  opt('xl', 'XL'),
  opt('xxl', 'XXL'),
  opt('34', '34'),
  opt('36', '36'),
  opt('38', '38'),
  opt('40', '40'),
  opt('42', '42'),
  opt('44', '44'),
  opt('unica', 'Única'),
];

const FASHION_COLORS = [
  opt('negro', 'Negro'),
  opt('blanco', 'Blanco'),
  opt('azul', 'Azul'),
  opt('beige', 'Beige'),
  opt('verde', 'Verde'),
  opt('rojo', 'Rojo'),
  opt('rosado', 'Rosado'),
  opt('multicolor', 'Multicolor'),
];

const KID_AGES = [
  opt('0-6m', '0 – 6 meses'),
  opt('6-12m', '6 – 12 meses'),
  opt('1-3a', '1 – 3 años'),
  opt('3-6a', '3 – 6 años'),
  opt('6a+', '6 años a más'),
];

const ENTERTAINMENT_TOPICS = [
  opt('ficcion', 'Ficción'),
  opt('no-ficcion', 'No ficción'),
  opt('infantil-juvenil', 'Infantil y juvenil'),
  opt('arte-diseno', 'Arte y diseño'),
  opt('musica', 'Música'),
  opt('deportes', 'Deportes'),
  opt('historia', 'Historia'),
];

const ENTERTAINMENT_FORMATS = [
  opt('fisico', 'Físico'),
  opt('digital', 'Digital'),
  opt('coleccion', 'Colección'),
];

const COLLECTIONS = [
  opt('pokemon', 'Pokémon'),
  opt('yugioh', 'Yu-Gi-Oh!'),
  opt('magic', 'Magic: The Gathering'),
  opt('star-wars', 'Star Wars'),
  opt('marvel', 'Marvel'),
  opt('dc', 'DC'),
  opt('otras', 'Otras'),
];

const ERAS = [
  opt('antes-1950', 'Antes de 1950'),
  opt('1950-1990', '1950 – 1990'),
  opt('1990-2010', '1990 – 2010'),
  opt('despues-2010', 'Después de 2010'),
];

const SPORTS = [
  opt('futbol', 'Fútbol'),
  opt('basquet', 'Básquet'),
  opt('voley', 'Vóley'),
  opt('running', 'Running'),
  opt('ciclismo', 'Ciclismo'),
  opt('natacion', 'Natación'),
  opt('camping', 'Camping'),
  opt('pesca', 'Pesca'),
  opt('gimnasio', 'Gimnasio'),
  opt('otros', 'Otros'),
];

const SPORT_BRANDS = [
  opt('nike', 'Nike'),
  opt('adidas', 'Adidas'),
  opt('puma', 'Puma'),
  opt('under-armour', 'Under Armour'),
  opt('decathlon', 'Decathlon'),
  opt('otras', 'Otras'),
];

const HOME_ROOMS = [
  opt('sala', 'Sala'),
  opt('comedor', 'Comedor'),
  opt('dormitorio', 'Dormitorio'),
  opt('cocina', 'Cocina'),
  opt('bano', 'Baño'),
  opt('jardin', 'Jardín'),
  opt('terraza', 'Terraza'),
];

const HOME_MATERIALS = [
  opt('madera', 'Madera'),
  opt('metal', 'Metal'),
  opt('vidrio', 'Vidrio'),
  opt('plastico', 'Plástico'),
  opt('tela', 'Tela'),
  opt('mimbre', 'Mimbre'),
];

const APPLIANCE_BRANDS = [
  opt('lg', 'LG'),
  opt('samsung', 'Samsung'),
  opt('whirlpool', 'Whirlpool'),
  opt('mabe', 'Mabe'),
  opt('electrolux', 'Electrolux'),
  opt('bosch', 'Bosch'),
  opt('philips', 'Philips'),
  opt('otras', 'Otras'),
];

const TOOL_BRANDS = [
  opt('bosch', 'Bosch'),
  opt('dewalt', 'DeWalt'),
  opt('makita', 'Makita'),
  opt('stanley', 'Stanley'),
  opt('truper', 'Truper'),
  opt('osram', 'Osram'),
  opt('otras', 'Otras'),
];

const CONSTRUCTION_MATERIALS = [
  opt('cemento', 'Cemento'),
  opt('fierro', 'Fierro'),
  opt('madera', 'Madera'),
  opt('ceramica', 'Cerámica'),
  opt('drywall', 'Drywall'),
  opt('pintura', 'Pintura'),
  opt('otros', 'Otros'),
];

const VEHICLE_BRANDS = [
  opt('toyota', 'Toyota'),
  opt('hyundai', 'Hyundai'),
  opt('kia', 'Kia'),
  opt('nissan', 'Nissan'),
  opt('chevrolet', 'Chevrolet'),
  opt('ford', 'Ford'),
  opt('honda', 'Honda'),
  opt('mazda', 'Mazda'),
  opt('suzuki', 'Suzuki'),
  opt('volkswagen', 'Volkswagen'),
  opt('yamaha', 'Yamaha'),
  opt('bajaj', 'Bajaj'),
  opt('otras', 'Otras'),
];

const VEHICLE_YEARS = [
  opt('2025', '2025'),
  opt('2024', '2024'),
  opt('2023', '2023'),
  opt('2022', '2022'),
  opt('2021', '2021'),
  opt('2020', '2020'),
  opt('2015-2019', '2015 – 2019'),
  opt('2010-2014', '2010 – 2014'),
  opt('antes-2010', 'Antes de 2010'),
];

const FUEL_TYPES = [
  opt('gasolina', 'Gasolina'),
  opt('diesel', 'Diésel'),
  opt('glp', 'GLP'),
  opt('gnv', 'GNV'),
  opt('electrico', 'Eléctrico'),
  opt('hibrido', 'Híbrido'),
];

const TRANSMISSIONS = [
  opt('manual', 'Manual'),
  opt('automatica', 'Automática'),
];

/* ------------------------------------------------------------------ */
/* Categorías de productos                                             */
/* ------------------------------------------------------------------ */

export const PRODUCT_CATEGORIES = [
  {
    id: 'tecnologia',
    label: 'Tecnología',
    subcategories: [
      { id: 'tv-proyectores', label: 'TVs y proyectores' },
      { id: 'sonido', label: 'Sonido (audífonos y parlantes)' },
      { id: 'fotografia', label: 'Fotografía (cámaras y drones)' },
      { id: 'telefonos', label: 'Teléfonos (celulares y smartwatches)' },
      { id: 'computacion', label: 'Computación (computadores y tablets)' },
      { id: 'gaming', label: 'Gaming (consolas y videojuegos)' },
    ],
    filters: [
      { key: 'brand', label: 'Marca', options: TECH_BRANDS },
      {
        key: 'storage',
        label: 'Almacenamiento',
        options: [
          opt('64gb', '64 GB'),
          opt('128gb', '128 GB'),
          opt('256gb', '256 GB'),
          opt('512gb', '512 GB'),
          opt('1tb', '1 TB'),
        ],
      },
    ],
  },
  {
    id: 'bicicletas',
    label: 'Bicicletas',
    subcategories: [
      { id: 'bicis-triciclos', label: 'Bicicletas y triciclos' },
      { id: 'accesorios', label: 'Accesorios de bicicleta' },
      { id: 'componentes', label: 'Componentes y repuestos' },
      { id: 'protecciones', label: 'Protecciones y ropa de ciclismo' },
      { id: 'otros-ciclismo', label: 'Otros productos de ciclismo' },
    ],
    filters: [
      { key: 'bikeType', label: 'Tipo de bicicleta', options: BIKE_TYPES },
      { key: 'brand', label: 'Marca', options: BIKE_BRANDS },
      { key: 'wheel', label: 'Rodado / Aro', options: BIKE_WHEELS },
    ],
  },
  {
    id: 'moda',
    label: 'Moda',
    subcategories: [
      { id: 'ropa-mujer', label: 'Ropa de mujer' },
      { id: 'ropa-hombre', label: 'Ropa de hombre' },
      { id: 'calzado', label: 'Calzado' },
      { id: 'carteras-mochilas', label: 'Carteras y mochilas' },
      { id: 'accesorios-joyas', label: 'Accesorios y joyas' },
      { id: 'moda-infantil', label: 'Moda infantil y bebé' },
    ],
    filters: [
      { key: 'size', label: 'Talla', options: FASHION_SIZES },
      {
        key: 'brand',
        label: 'Marca',
        options: [
          opt('zara', 'Zara'),
          opt('hm', 'H&M'),
          opt('nike', 'Nike'),
          opt('adidas', 'Adidas'),
          opt('levis', "Levi's"),
          opt('tommy', 'Tommy Hilfiger'),
          opt('otras', 'Otras'),
        ],
      },
      { key: 'color', label: 'Color', options: FASHION_COLORS },
    ],
  },
  {
    id: 'bebe-ninos',
    label: 'Bebé y Niños',
    subcategories: [
      { id: 'coches-paseo', label: 'Coches y paseo' },
      { id: 'sillas-auto', label: 'Sillas de auto y seguridad' },
      { id: 'juguetes', label: 'Juguetes y juegos de mesa' },
      { id: 'ropa-infantil', label: 'Ropa infantil' },
      { id: 'muebles-decoracion', label: 'Muebles y decoración' },
    ],
    filters: [
      { key: 'ageRange', label: 'Edad recomendada', options: KID_AGES },
      {
        key: 'brand',
        label: 'Marca',
        options: [
          opt('chicco', 'Chicco'),
          opt('graco', 'Graco'),
          opt('fisher-price', 'Fisher-Price'),
          opt('mattel', 'Mattel'),
          opt('lego', 'LEGO'),
          opt('infanti', 'Infanti'),
          opt('otras', 'Otras'),
        ],
      },
    ],
  },
  {
    id: 'entretenimiento',
    label: 'Entretenimiento',
    subcategories: [
      { id: 'libros-comics', label: 'Libros, revistas y cómics' },
      { id: 'instrumentos', label: 'Instrumentos musicales' },
      { id: 'juegos-coleccionables', label: 'Juegos de mesa y coleccionables' },
      { id: 'deportes-aire-libre', label: 'Deportes y aire libre' },
    ],
    filters: [
      { key: 'topic', label: 'Temática', options: ENTERTAINMENT_TOPICS },
      { key: 'format', label: 'Formato', options: ENTERTAINMENT_FORMATS },
    ],
  },
  {
    id: 'coleccionismo',
    label: 'Coleccionismo',
    subcategories: [
      { id: 'cartas', label: 'Cartas coleccionables' },
      { id: 'figuras', label: 'Figuras de acción' },
      { id: 'antiguedades-arte', label: 'Antigüedades y arte' },
      { id: 'monedas-billetes', label: 'Monedas y billetes' },
    ],
    filters: [
      { key: 'collection', label: 'Colección', options: COLLECTIONS },
      { key: 'era', label: 'Época', options: ERAS },
    ],
  },
  {
    id: 'deporte',
    label: 'Deporte',
    subcategories: [
      { id: 'fitness', label: 'Fitness y musculación' },
      { id: 'futbol-equipo', label: 'Fútbol y deportes de equipo' },
      { id: 'outdoor', label: 'Outdoor y camping' },
      { id: 'acuaticos', label: 'Deportes acuáticos' },
    ],
    filters: [
      { key: 'sport', label: 'Deporte', options: SPORTS },
      { key: 'brand', label: 'Marca', options: SPORT_BRANDS },
    ],
  },
  {
    id: 'hogar-jardin',
    label: 'Hogar y Jardín',
    subcategories: [
      { id: 'muebles', label: 'Muebles' },
      { id: 'decoracion', label: 'Decoración' },
      { id: 'jardin', label: 'Jardín y exterior' },
      { id: 'cocina-comedor', label: 'Cocina y comedor' },
      { id: 'iluminacion', label: 'Iluminación' },
      { id: 'organizacion', label: 'Organización' },
    ],
    filters: [
      { key: 'room', label: 'Ambiente', options: HOME_ROOMS },
      { key: 'material', label: 'Material', options: HOME_MATERIALS },
    ],
  },
  {
    id: 'electrodomesticos',
    label: 'Electrodomésticos',
    subcategories: [
      { id: 'cocina', label: 'Cocina' },
      { id: 'refrigeracion', label: 'Refrigeración' },
      { id: 'lavado', label: 'Lavado' },
      { id: 'climatizacion', label: 'Climatización' },
      { id: 'pequenos', label: 'Pequeños electrodomésticos' },
    ],
    filters: [{ key: 'brand', label: 'Marca', options: APPLIANCE_BRANDS }],
  },
  {
    id: 'construccion',
    label: 'Construcción',
    subcategories: [
      { id: 'herramientas', label: 'Herramientas' },
      { id: 'materiales', label: 'Materiales' },
      { id: 'sanitarios', label: 'Sanitarios y grifería' },
      { id: 'electricidad', label: 'Electricidad' },
      { id: 'pintura', label: 'Pintura' },
      { id: 'seguridad', label: 'Seguridad industrial' },
    ],
    filters: [
      { key: 'brand', label: 'Marca', options: TOOL_BRANDS },
      { key: 'material', label: 'Material', options: CONSTRUCTION_MATERIALS },
    ],
  },
  {
    id: 'autos-motos',
    label: 'Autos y Motos',
    subcategories: [
      { id: 'autos', label: 'Autos' },
      { id: 'motos', label: 'Motos' },
      { id: 'camionetas-suv', label: 'Camionetas y SUV' },
      { id: 'repuestos', label: 'Repuestos' },
      { id: 'accesorios-vehiculo', label: 'Accesorios para vehículos' },
      { id: 'llantas', label: 'Llantas y aros' },
    ],
    filters: [
      { key: 'brand', label: 'Marca', options: VEHICLE_BRANDS },
      { key: 'year', label: 'Año', options: VEHICLE_YEARS },
      { key: 'fuel', label: 'Combustible', options: FUEL_TYPES },
      { key: 'transmission', label: 'Transmisión', options: TRANSMISSIONS },
    ],
  },
  {
    id: 'otros',
    label: 'Otros',
    subcategories: [{ id: 'varios', label: 'Otros productos' }],
    filters: [],
  },
];

/* ------------------------------------------------------------------ */
/* Categorías de servicios                                             */
/* ------------------------------------------------------------------ */

export const SERVICE_CATEGORIES = [
  { id: 'limpieza', label: 'Limpieza', subcategories: [], filters: [] },
  { id: 'clases', label: 'Clases', subcategories: [], filters: [] },
  { id: 'reparaciones', label: 'Reparaciones', subcategories: [], filters: [] },
  { id: 'mudanzas', label: 'Mudanzas', subcategories: [], filters: [] },
  { id: 'belleza', label: 'Belleza', subcategories: [], filters: [] },
  { id: 'otros-servicios', label: 'Otros servicios', subcategories: [], filters: [] },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const ALL_ATTRIBUTE_KEYS = [
  ...new Set(
    PRODUCT_CATEGORIES.flatMap((category) =>
      category.filters.map((group) => group.key),
    ),
  ),
];

export function categoriesForType(type = 'producto') {
  return type === 'servicio' ? SERVICE_CATEGORIES : PRODUCT_CATEGORIES;
}

export function getCategoryDef(id, type = 'producto') {
  if (!id) return null;
  return categoriesForType(type).find((category) => category.id === id) || null;
}

export function getCategoryLabel(id, type = 'producto') {
  return getCategoryDef(id, type)?.label || '';
}

export function getSubcategoryDef(categoryId, subcategoryId, type = 'producto') {
  if (!categoryId || !subcategoryId) return null;
  return (
    getCategoryDef(categoryId, type)?.subcategories.find(
      (subcategory) => subcategory.id === subcategoryId,
    ) || null
  );
}

export function getSubcategoryLabel(categoryId, subcategoryId, type = 'producto') {
  return getSubcategoryDef(categoryId, subcategoryId, type)?.label || '';
}

export function normalizeConditionValue(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return null;
  return CONDITION_ALIASES[key] || (CONDITIONS.some((c) => c.value === key) ? key : null);
}

export function getCondition(value) {
  const normalized = normalizeConditionValue(value);
  if (!normalized) return null;
  return CONDITIONS.find((condition) => condition.value === normalized) || null;
}

export function conditionLabel(value) {
  return getCondition(value)?.label || (value ? String(value) : '');
}

export function getDateRange(value) {
  return DATE_RANGES.find((range) => range.value === value) || null;
}

export function getPriceRange(id) {
  return PRICE_RANGES.find((range) => range.id === id) || null;
}

export function getAttributeLabel(categoryId, key, value) {
  const category = getCategoryDef(categoryId, 'producto');
  const group =
    category?.filters.find((filter) => filter.key === key) ||
    PRODUCT_CATEGORIES.flatMap((c) => c.filters).find(
      (filter) => filter.key === key,
    );
  if (!group) return String(value ?? '');
  return (
    group.options.find((option) => option.value === String(value))?.label ||
    String(value ?? '')
  );
}

/** Atributos de un anuncio listos para mostrar en la ficha. */
export function getAttributeEntries(listing) {
  const attributes = listing?.attributes;
  if (
    !attributes ||
    typeof attributes !== 'object' ||
    Array.isArray(attributes)
  ) {
    return [];
  }
  const type = listing.type === 'servicio' ? 'servicio' : 'producto';
  const category = getCategoryDef(listing.category, type);
  const groups = category?.filters || PRODUCT_CATEGORIES.flatMap((c) => c.filters);

  return Object.entries(attributes)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => {
      const group = groups.find((filter) => filter.key === key);
      const option = group?.options.find(
        (item) => item.value === String(value),
      );
      return {
        key,
        label: group?.label || key,
        value: String(value),
        valueLabel: option?.label || String(value),
      };
    });
}

/**
 * Enlaces de navegación de una ficha (diseño motor de fichas §4.3). Waze y Google Maps
 * buscan por TEXTO (nombre + dirección), igual que los botones públicos de
 * `ClinicaCard.astro` y `FiltrosDashboard.astro`; nunca por coordenadas (`ll=`,
 * `query=lat,lng`). Puro y sin dependencias: lo usan el panel (cliente), el Worker y la CLI.
 */

export interface NavLinkInput {
  nombre: string;
  direccion?: string;
  zona?: string;
  provincia?: string;
}

export interface NavLinks {
  waze_url: string;
  maps_url: string;
}

/** Tope del texto de búsqueda: mantiene la URL muy por debajo de 2 048 caracteres. */
const MAX_QUERY_CHARS = 300;

const clean = (value: string | undefined) => (value ?? '').replace(/\s+/g, ' ').trim();

/** "Nombre, dirección, Costa Rica". Sin dirección usa zona y provincia como respaldo. */
export function navSearchText({ nombre, direccion, zona, provincia }: NavLinkInput): string {
  const name = clean(nombre);
  if (!name) throw new Error('buildNavLinks requiere el nombre de la clínica');
  const place = clean(direccion) || [clean(zona), clean(provincia)].filter(Boolean).join(', ');
  const parts = [name, place].filter(Boolean);
  // "Costa Rica" evita homónimos fuera del país (p. ej. Hatillo, Puerto Rico).
  const plain = parts.join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (!plain.includes('costa rica')) parts.push('Costa Rica');
  const text = parts.join(', ');
  if (text.length <= MAX_QUERY_CHARS) return text;
  const cut = text.slice(0, MAX_QUERY_CHARS);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : MAX_QUERY_CHARS).replace(/[\s,]+$/, '');
}

export function buildNavLinks(input: NavLinkInput): NavLinks {
  const query = encodeURIComponent(navSearchText(input));
  return {
    waze_url: `https://waze.com/ul?q=${query}&navigate=yes`,
    maps_url: `https://www.google.com/maps/search/?api=1&query=${query}`,
  };
}

/**
 * npm run check:no-google-content — el repositorio es público: `research/` y `src/content/`
 * no pueden contener contenido de Google Places/Maps ni resultados de Brave Search
 * (diseño motor de fichas §3.3, §11). Solo `place_id` es almacenable.
 *
 * Busca claves y patrones de payloads, coordenadas incrustadas en enlaces de Google y, en
 * `research/`, correos y teléfonos fuera de los campos de teléfono de la evidencia (P7).
 * Uso: node scripts/clinics/check-no-google-content.ts [dir…]  (por defecto research src/content)
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Finding {
  path: string;
  line: number;
  code: string;
  excerpt: string;
}

const TEXT_EXTENSIONS = /\.(?:md|mdx|json|jsonl|ya?ml|txt|csv|tsv|html?)$/i;

// Claves de Places API (New) y del payload de Brave Search. Los nombres en camelCase no
// aparecen en fichas ni en artículos; su presencia indica un volcado de la API.
const PAYLOAD_PATTERNS: ReadonlyArray<[code: string, pattern: RegExp]> = [
  ['google_places_payload', /\b(?:regularOpeningHours|currentOpeningHours|regularSecondaryOpeningHours|googleMapsUri|googleMapsLinks|formattedAddress|shortFormattedAddress|adrFormatAddress|addressComponents|nationalPhoneNumber|internationalPhoneNumber|businessStatus|userRatingCount|editorialSummary|plusCode|utcOffsetMinutes|primaryTypeDisplayName|websiteUri|movedPlaceId)\b/],
  ['google_places_resource', /(?<![/\w.-])places\/[A-Za-z0-9_-]{10,}/],
  ['google_api_host', /\b(?:places|maps)\.googleapis\.com\b/],
  ['google_maps_coordinates', /!3d-?\d+(?:\.\d+)?!4d-?\d+(?:\.\d+)?|google\.[a-z.]+\/maps\/[^\s"')]*\/@-?\d+\.\d+,-?\d+\.\d+/],
  ['nav_link_coordinates', /(?:waze\.com\/ul|google\.[a-z.]+\/maps)[^\s"')]*[?&](?:ll|sll|query|q)=[-+]?\d{1,3}(?:\.\d+)?(?:,|%2C)[-+]?\d{1,3}(?:\.\d+)?/i],
  ['brave_search_payload', /\b(?:extra_snippets|meta_url|page_age)\b/],
];
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
const PHONE = /(?<![\d-])(?:\+?506[\s-]?)?[245678]\d{3}[\s.-]?\d{4}(?![\d-])/;
const PHONE_FIELDS = new Set(['telefono1', 'telefono2', 'whatsapp']);

const clip = (text: string) => (text.length > 100 ? `${text.slice(0, 97)}…` : text).trim();

/** Patrones de payload línea a línea; en `research/` además correos y teléfonos sueltos. */
export function scanText(path: string, text: string, { research }: { research: boolean }): Finding[] {
  const findings: Finding[] = [];
  const isJson = path.toLowerCase().endsWith('.json');
  text.split(/\r?\n/).forEach((content, index) => {
    for (const [code, pattern] of PAYLOAD_PATTERNS) if (pattern.test(content)) findings.push({ path, line: index + 1, code, excerpt: clip(content) });
    if (research && EMAIL.test(content)) findings.push({ path, line: index + 1, code: 'email_in_research', excerpt: '(correo omitido)' });
    // En JSON los teléfonos se revisan por campo (scanResearchJson), no por línea.
    if (research && !isJson && PHONE.test(content)) findings.push({ path, line: index + 1, code: 'phone_outside_field', excerpt: '(teléfono omitido)' });
  });
  if (research && isJson) {
    try {
      findings.push(...scanResearchJson(path, JSON.parse(text)));
    } catch {
      findings.push({ path, line: 1, code: 'invalid_json', excerpt: '' });
    }
  }
  return findings;
}

/**
 * En la evidencia, un teléfono solo puede ir como valor de un hecho o conflicto cuyo campo
 * sea telefono1/telefono2/whatsapp. En notas, referencias o cualquier otro lugar es un dato
 * personal potencial y se rechaza.
 */
export function scanResearchJson(path: string, value: unknown): Finding[] {
  const findings: Finding[] = [];
  const walk = (node: unknown, trail: (string | number)[], allowed: boolean) => {
    if (typeof node === 'string') {
      if (!allowed && PHONE.test(node)) findings.push({ path, line: 0, code: 'phone_outside_field', excerpt: trail.join('.') });
      return;
    }
    if (Array.isArray(node)) { node.forEach((item, index) => walk(item, [...trail, index], allowed)); return; }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    // facts[i] y conflicts[i] con campo de teléfono: su value/values sí pueden ser teléfonos.
    const phoneField = typeof record.field === 'string' && PHONE_FIELDS.has(record.field) && ['facts', 'conflicts'].includes(String(trail.at(-2)));
    for (const [key, child] of Object.entries(record)) walk(child, [...trail, key], allowed || (phoneField && (key === 'value' || key === 'values')));
  };
  walk(value, [], false);
  return findings;
}

function files(path: string): string[] {
  if (!existsSync(path)) return [];
  if (statSync(path).isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => files(join(path, entry.name)));
}

export function scanTree(root: string, dirs: readonly string[] = ['research', 'src/content']): { scanned: number; findings: Finding[] } {
  const paths = dirs.flatMap((dir) => files(join(root, dir))).filter((path) => TEXT_EXTENSIONS.test(path)).sort();
  const findings = paths.flatMap((path) => {
    const rel = relative(root, path).replaceAll('\\', '/');
    return scanText(rel, readFileSync(path, 'utf8'), { research: rel.startsWith('research/') });
  });
  return { scanned: paths.length, findings };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dirs = process.argv.slice(2);
  const { scanned, findings } = scanTree(process.cwd(), dirs.length ? dirs : undefined);
  if (findings.length) {
    console.error(`check:no-google-content FAIL (${findings.length} hallazgos en ${scanned} archivos)`);
    for (const finding of findings) console.error(`  ${finding.path}${finding.line ? `:${finding.line}` : ''} · ${finding.code} · ${finding.excerpt}`);
    process.exitCode = 1;
  } else {
    console.log(`check:no-google-content PASS (${scanned} archivos)`);
  }
}

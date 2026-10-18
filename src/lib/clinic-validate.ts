import { z } from 'zod';
import { isSafeHttpsUrl, STORABLE_LOCATION_SOURCES, type clinicSchema } from './clinic-schema.ts';
import { costaRicaDate, deriveVerification, type Evidence } from './clinic-evidence.ts';

/**
 * Validador de fichas (diseño motor de fichas §4.1–§4.3). Puro: recibe fichas ya parseadas
 * con `clinicSchema` y la evidencia opcional; devuelve problemas con severidad.
 *
 * Fichas nuevas o modificadas cumplen las reglas estrictas. La deuda heredada se tolera
 * con una base versionada: un problema "de deuda" (`debtValue`) solo se perdona si la base
 * contiene exactamente esa ficha, regla, campo y valor. Si el valor cambia (coordenadas,
 * teléfono, enlace o estado declarado), la exención deja de aplicar y el error vuelve.
 */

export type Clinic = z.output<typeof clinicSchema>;
export type Severity = 'error' | 'warning';

export interface ValidationIssue {
  slug: string;
  code: string;
  field: string;
  severity: Severity;
  message: string;
  /** Presente solo en errores que pueden quedar cubiertos por la base de deuda. */
  debtValue?: string;
}

export interface GoogleDerivedCoordinate {
  slug: string;
  value: string;
  commit?: string;
  reason: string;
}

export interface ValidateOptions {
  now: Date;
  evidence?: Evidence | null;
  /** Coordenadas conocidas como copiadas de Google (§1.2.3): nunca pueden «blanquearse». */
  googleDerivedCoordinates?: readonly GoogleDerivedCoordinate[];
}

// Caja continental (SDD §3.2) y excepción territorial explícita de la Isla del Coco.
export const CR_BOUNDS = { minLat: 8.0, maxLat: 11.3, minLng: -86.0, maxLng: -82.5 } as const;
const COCO_BOUNDS = { minLat: 5.3, maxLat: 5.7, minLng: -87.2, maxLng: -86.9 } as const;
const inside = (lat: number, lng: number, box: { minLat: number; maxLat: number; minLng: number; maxLng: number }) =>
  lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;

/** Objetivo 5 decimales (≈1 m); 4 (≈11 m) se avisa; menos de 4 es error. */
export const MIN_COORD_DECIMALS = 4;

/** Decimales de la representación numérica más corta (9.7500 en YAML es 9.75: 2 decimales). */
export function coordinateDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const text = String(Math.abs(value));
  const [mantissa, exponent] = text.split('e');
  const decimals = (mantissa.split('.')[1] ?? '').length - Number(exponent ?? 0);
  return Math.max(0, decimals);
}

export const coordinateKey = (lat: number, lng: number) => `${lat},${lng}`;

/** Teléfono de Costa Rica ya normalizado: `####-####` (fijo 2/4, móvil 5–8) o `800-###-####`. */
export function isCrPhone(value: string): boolean {
  return /^[245678]\d{3}-\d{4}$/.test(value) || /^800-\d{3}-\d{4}$/.test(value);
}

const COORDINATE_TEXT = /^\s*[-+]?\d{1,3}(?:\.\d+)?\s*,\s*[-+]?\d{1,3}(?:\.\d+)?\s*$/;

/** Problemas de un enlace de navegación; [] si es una búsqueda por texto válida. */
export function navLinkProblems(kind: 'waze_url' | 'maps_url', value: string): string[] {
  if (!isSafeHttpsUrl(value)) return ['debe ser una URL HTTPS sin credenciales ni puerto, de 2 048 caracteres como máximo'];
  const url = new URL(value);
  const problems: string[] = [];
  const text = kind === 'waze_url' ? url.searchParams.get('q') : url.searchParams.get('query');
  if (kind === 'waze_url') {
    if (url.hostname !== 'waze.com' || url.pathname !== '/ul') problems.push('el host y la ruta deben ser exactamente waze.com/ul');
  } else {
    if (url.hostname !== 'www.google.com' || !/^\/maps\/search\/?$/.test(url.pathname)) problems.push('el host y la ruta deben ser exactamente www.google.com/maps/search/');
    if (url.searchParams.get('api') !== '1') problems.push('falta api=1');
    if (url.searchParams.has('query_place_id')) problems.push('query_place_id no se usa por ahora (D8: solo texto)');
  }
  for (const param of ['ll', 'sll', 'center', 'll_place_id']) if (url.searchParams.has(param)) problems.push(`no se permite ${param}= (búsqueda por texto, no por coordenadas)`);
  if (!text || !text.trim()) problems.push(`falta el texto de búsqueda (${kind === 'waze_url' ? 'q' : 'query'}=)`);
  else if (COORDINATE_TEXT.test(text)) problems.push('el texto de búsqueda son coordenadas; debe ser nombre y dirección');
  if (/!3d-?\d|\/@-?\d/.test(value)) problems.push('contiene coordenadas de Google Maps');
  return problems;
}

const SOCIAL_HOSTS: Partial<Record<'web' | 'facebook' | 'instagram', readonly string[]>> = {
  facebook: ['facebook.com', 'www.facebook.com', 'm.facebook.com', 'web.facebook.com', 'fb.com'],
  instagram: ['instagram.com', 'www.instagram.com'],
};

type RecordStatus = Clinic['record_status'];
const STATUS_RANK: Record<RecordStatus, number> = { CANDIDATE_REMOVAL: 0, REVIEW_REQUIRED: 0, PARTIAL: 1, VERIFIED: 2 };
const DERIVED_FLAGS = ['officially_confirmed', 'phone_verified', 'address_verified', 'schedule_verified'] as const;

/** Problemas de una ficha aislada. Las reglas entre fichas viven en `validateCatalog`. */
export function validateClinicRecord(clinic: Clinic, options: ValidateOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (severity: Severity, code: string, field: string, message: string, debtValue?: string) =>
    issues.push({ slug: clinic.slug, code, field, severity, message, ...(debtValue === undefined ? {} : { debtValue }) });
  const today = costaRicaDate(options.now);

  // --- Coordenadas (§4.2)
  const { latitude: lat, longitude: lng } = clinic;
  const key = coordinateKey(lat, lng);
  const storable = (STORABLE_LOCATION_SOURCES as readonly string[]).includes(clinic.location_source);
  if (lat === 0 && lng === 0) {
    // 0,0 es el centinela de «sin coordenadas»: solo un borrador puede publicarse así.
    if (clinic.estado === 'pendiente') add('warning', 'coord_missing', 'latitude', 'Borrador sin coordenadas; obligatorias antes de publicar.');
    else add('error', 'coord_missing', 'latitude', 'Ficha publicada sin coordenadas.');
  } else if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    add('error', 'coord_zero', 'latitude', `Coordenadas inválidas (${key}).`);
  } else {
    const coco = inside(lat, lng, COCO_BOUNDS);
    if (!inside(lat, lng, CR_BOUNDS)) {
      const cocoNoted = clinic.verification_notes.some((note) => /isla del coco/i.test(note));
      if (!coco) add('error', 'coord_out_of_cr', 'latitude', `(${key}) fuera de Costa Rica continental (lat 8,0–11,3; lng −86,0 a −82,5).`);
      else if (!storable || !cocoNoted) add('error', 'coord_out_of_cr', 'latitude', 'Isla del Coco exige location_source almacenable y una nota en verification_notes que la mencione.');
    }
    const decimals = Math.min(coordinateDecimals(lat), coordinateDecimals(lng));
    if (decimals < MIN_COORD_DECIMALS) add('error', 'coord_precision', 'coordinates', `Precisión de ${decimals} decimales (${key}); se exigen ${MIN_COORD_DECIMALS} o más (objetivo 5).`, key);
    else if (decimals === MIN_COORD_DECIMALS) add('warning', 'coord_precision_4', 'coordinates', `Precisión de 4 decimales (≈11 m) en ${key}; el objetivo son 5.`);
    if (clinic.location_source === 'legacy_unknown') add('error', 'coord_source', 'location_source', `Coordenadas ${key} sin fuente almacenable (location_source: legacy_unknown).`, key);
    const tainted = options.googleDerivedCoordinates?.find((entry) => entry.slug === clinic.slug && entry.value === key);
    if (tainted) {
      if (clinic.location_source !== 'legacy_unknown') add('error', 'coord_google_derived', 'location_source', `Las coordenadas ${key} provienen de Google Maps (${tainted.commit ?? 'sin commit'}); hay que re-obtenerlas, no cambiar solo location_source.`);
      else add('warning', 'coord_google_derived', 'coordinates', `Coordenadas tomadas de Google Maps (${tainted.commit ?? 'sin commit'}); re-obtener con confirmación de la clínica o pin propio.`);
    }
  }
  if (storable && !clinic.location_verified_at) add('error', 'coord_source', 'location_verified_at', `location_source ${clinic.location_source} requiere location_verified_at.`);
  if (clinic.location_verified_at && clinic.location_source === 'legacy_unknown') add('error', 'coord_source', 'location_verified_at', 'location_verified_at sin location_source almacenable.');
  if (clinic.location_verified_at && clinic.location_verified_at > today) add('error', 'date_in_future', 'location_verified_at', `Fecha futura: ${clinic.location_verified_at}.`);

  // --- Teléfonos (§4.1)
  for (const field of ['telefono1', 'telefono2', 'whatsapp'] as const) {
    const value = clinic[field];
    if (!value) continue;
    if (!isCrPhone(value)) add('error', 'phone_format', field, `«${value}» no cumple ####-#### (2/4/5–8) ni 800-###-####.`, value);
    else if (field === 'whatsapp' && value.startsWith('800')) add('error', 'phone_format', field, 'Un 800 no puede ser WhatsApp.', value);
    else if (field === 'whatsapp' && !/^[5678]/.test(value)) add('warning', 'whatsapp_not_mobile', field, `WhatsApp en número no móvil (${value}); confirmar que es WhatsApp Business.`);
  }

  // --- Enlaces (§4.3)
  for (const field of ['waze_url', 'maps_url'] as const) {
    const value = clinic[field];
    if (!value) { add('warning', 'nav_link_missing', field, 'Sin enlace; el sitio usa el respaldo por nombre y dirección.'); continue; }
    const problems = navLinkProblems(field, value);
    if (problems.length) add('error', 'nav_link', field, problems.join('; '), value);
  }
  for (const field of ['web', 'facebook', 'instagram'] as const) {
    const value = clinic[field];
    if (!value) continue;
    const hosts = SOCIAL_HOSTS[field];
    if (!isSafeHttpsUrl(value)) add('error', 'link_format', field, `«${value}» no es una URL HTTPS completa.`, value);
    else if (hosts && !hosts.includes(new URL(value).hostname)) add('error', 'link_format', field, `«${value}» no es un enlace de ${field}.`, value);
  }

  // --- place_id (§4.1)
  const checkedAt = clinic.google_place_id_checked_at;
  if (checkedAt && !clinic.google_place_id) add('error', 'place_id_checked_orphan', 'google_place_id_checked_at', 'Fecha de comprobación sin google_place_id.');
  if (clinic.google_place_id && !checkedAt) add('warning', 'place_id_unchecked', 'google_place_id_checked_at', 'google_place_id sin fecha de comprobación.');
  if (checkedAt && checkedAt > today) add('error', 'date_in_future', 'google_place_id_checked_at', `Fecha futura: ${checkedAt}.`);
  else if (clinic.google_place_id && checkedAt && Date.parse(today) - Date.parse(checkedAt) > 365 * 86_400_000)
    add('warning', 'place_id_stale', 'google_place_id_checked_at', `place_id comprobado el ${checkedAt}; refrescar (más de 12 meses).`);

  // --- Verificación declarada frente a la derivada de la evidencia (§4.6)
  const derived = deriveVerification(options.evidence ?? null, options.now);
  const overclaims = [
    ...(STATUS_RANK[clinic.record_status] > STATUS_RANK[derived.record_status] ? [`record_status ${clinic.record_status} (evidencia: ${derived.record_status})`] : []),
    ...DERIVED_FLAGS.filter((flag) => clinic[flag] && !derived[flag]).map((flag) => `${flag}: true sin evidencia`),
  ];
  if (overclaims.length) {
    const claimed = [`record_status=${clinic.record_status}`, ...DERIVED_FLAGS.map((flag) => `${flag}=${clinic[flag]}`)].join(';');
    add('error', 'derivation_mismatch', 'record_status', `La ficha declara más de lo que respalda la evidencia: ${overclaims.join(', ')}.`, claimed);
  }
  return issues;
}

export interface CatalogRecord {
  slug: string;
  clinic: Clinic;
  evidence?: Evidence | null;
}

/** Valida todas las fichas y añade las reglas entre fichas (place_id único). */
export function validateCatalog(records: readonly CatalogRecord[], options: Omit<ValidateOptions, 'evidence'>): ValidationIssue[] {
  const issues = records.flatMap((record) => validateClinicRecord(record.clinic, { ...options, evidence: record.evidence ?? null }));
  const owners = new Map<string, string[]>();
  for (const { clinic } of records) if (clinic.google_place_id) owners.set(clinic.google_place_id, [...(owners.get(clinic.google_place_id) ?? []), clinic.slug]);
  for (const [placeId, slugs] of owners) {
    if (slugs.length < 2) continue;
    for (const slug of slugs) issues.push({ slug, code: 'place_id_duplicate', field: 'google_place_id', severity: 'error', message: `place_id ${placeId} repetido en: ${slugs.join(', ')}.` });
  }
  return issues;
}

// ---------------------------------------------------------------- base de deuda versionada

export const debtEntrySchema = z.strictObject({
  slug: z.string().min(1),
  ruleId: z.string().min(1),
  field: z.string().min(1),
  value: z.string(),
  reason: z.string().trim().min(1).max(500),
});
export const debtBaselineSchema = z.strictObject({
  schemaVersion: z.literal(1),
  description: z.string(),
  baselineCommit: z.string().regex(/^[0-9a-f]{7,40}$/),
  generatedAt: z.iso.datetime(),
  reviewRef: z.url(),
  googleDerivedCoordinates: z.array(z.strictObject({
    slug: z.string().min(1),
    value: z.string().regex(/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/),
    commit: z.string().regex(/^[0-9a-f]{7,40}$/).optional(),
    reason: z.string().trim().min(1).max(500),
  })),
  entries: z.array(debtEntrySchema),
}).superRefine((baseline, ctx) => {
  const keys = baseline.entries.map(debtKey);
  keys.forEach((key, index) => {
    if (keys.indexOf(key) !== index) ctx.addIssue({ code: 'custom', message: `Entrada duplicada: ${key}`, path: ['entries', index] });
    if (index > 0 && keys[index - 1] > key) ctx.addIssue({ code: 'custom', message: 'Las entradas deben ir ordenadas por slug, regla, campo y valor', path: ['entries', index] });
  });
});
export type DebtEntry = z.output<typeof debtEntrySchema>;
export type DebtBaseline = z.output<typeof debtBaselineSchema>;

const KEY_SEPARATOR = '\u0000';
export function debtKey(entry: { slug: string; ruleId?: string; code?: string; field: string; value?: string; debtValue?: string }) {
  return [entry.slug, entry.ruleId ?? entry.code, entry.field, entry.value ?? entry.debtValue].join(KEY_SEPARATOR);
}

export interface DebtReport {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Errores heredados cubiertos exactamente por la base. */
  debt: ValidationIssue[];
  /** Entradas de la base que ya no corresponden a ningún error: se pueden retirar. */
  stale: DebtEntry[];
}

export function applyDebtBaseline(issues: readonly ValidationIssue[], baseline: DebtBaseline | null): DebtReport {
  const entries = new Map((baseline?.entries ?? []).map((entry) => [debtKey(entry), entry]));
  const used = new Set<string>();
  const report: DebtReport = { errors: [], warnings: [], debt: [], stale: [] };
  for (const issue of issues) {
    if (issue.severity === 'warning') { report.warnings.push(issue); continue; }
    const key = issue.debtValue === undefined ? null : debtKey(issue);
    if (key && entries.has(key)) { report.debt.push(issue); used.add(key); } else report.errors.push(issue);
  }
  report.stale = [...entries].filter(([key]) => !used.has(key)).map(([, entry]) => entry);
  return report;
}

const DEFAULT_REASONS: Record<string, string> = {
  coord_precision: 'Coordenadas heredadas con menos de 4 decimales; re-obtener en F7 (#29).',
  coord_source: 'Coordenadas heredadas sin fuente almacenable; re-obtener en F7 (#29).',
  phone_format: 'Teléfono heredado fuera de formato; normalizar con evidencia.',
  link_format: 'Enlace heredado sin URL HTTPS completa; corregir con el sitio o la red propia de la clínica.',
  nav_link: 'Enlace de navegación heredado; regenerar con buildNavLinks().',
  derivation_mismatch: 'Verificación declarada a mano sin sidecar de evidencia v2; re-investigar en F7.',
};

/** JSON estable: una entrada por línea para que retirar deuda sea un diff de una línea. */
export function serializeDebtBaseline(baseline: DebtBaseline): string {
  const list = (items: readonly unknown[]) => (items.length ? `[\n${items.map((item) => `    ${JSON.stringify(item)}`).join(',\n')}\n  ]` : '[]');
  const { googleDerivedCoordinates, entries, ...head } = baseline;
  const top = Object.entries(head).map(([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  return `{\n${[...top, `  "googleDerivedCoordinates": ${list(googleDerivedCoordinates)}`, `  "entries": ${list(entries)}`].join(',\n')}\n}\n`;
}

/** Construye la base a partir de los errores de deuda actuales, conservando motivos ya escritos. */
export function buildDebtBaseline(issues: readonly ValidationIssue[], previous: DebtBaseline | null, meta: Pick<DebtBaseline, 'baselineCommit' | 'generatedAt' | 'reviewRef' | 'description'>): DebtBaseline {
  const reasons = new Map((previous?.entries ?? []).map((entry) => [debtKey(entry), entry.reason]));
  const entries = new Map<string, DebtEntry>();
  for (const issue of issues) {
    if (issue.severity !== 'error' || issue.debtValue === undefined) continue;
    const key = debtKey(issue);
    entries.set(key, { slug: issue.slug, ruleId: issue.code, field: issue.field, value: issue.debtValue, reason: reasons.get(key) ?? DEFAULT_REASONS[issue.code] ?? 'Deuda heredada.' });
  }
  return {
    schemaVersion: 1,
    description: meta.description,
    baselineCommit: meta.baselineCommit,
    generatedAt: meta.generatedAt,
    reviewRef: meta.reviewRef,
    googleDerivedCoordinates: previous?.googleDerivedCoordinates ?? [],
    entries: [...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, entry]) => entry),
  };
}

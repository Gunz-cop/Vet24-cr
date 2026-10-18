import { z } from 'zod';
import { googlePlaceIdSchema, isSafeHttpsUrl, STORABLE_LOCATION_SOURCES } from './clinic-schema.ts';

/**
 * Contrato de evidencia por ficha (`research/clinics/<slug>.json`), compartido por la API
 * admin, la CLI y CI. La v1 (formato de `validSidecar`) solo se acepta para leer; toda
 * escritura nueva es v2 (diseño motor de fichas §4.4). Puro: sin red, sin fs, sin reloj implícito.
 */

const httpsUrl = z.string().refine((value) => isSafeHttpsUrl(value), 'URL HTTPS pública requerida');
const confidenceSchema = z.enum(['high', 'medium', 'low']);

// ---------------------------------------------------------------- v1 (solo lectura)

// Misma regla que `validUtcDate` de la API admin: termina en Z y Date.parse la acepta.
const v1UtcInstant = z.string().refine((value) => value.endsWith('Z') && Number.isFinite(Date.parse(value)), 'Fecha UTC inválida');
const v1Reference = z.number().int().min(0);

export const evidenceV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  slug: z.string().min(1),
  observedAt: v1UtcInstant,
  fuentes: z.array(z.strictObject({
    url: httpsUrl,
    tipo: z.string(),
    consultedAt: v1UtcInstant.optional(),
    publishedAt: v1UtcInstant.optional(),
  })),
  facts: z.array(z.strictObject({ field: z.string(), value: z.unknown(), references: z.array(v1Reference), confidence: confidenceSchema })),
  conflicts: z.array(z.strictObject({ field: z.string(), values: z.array(z.unknown()), references: z.array(v1Reference), resolution: z.string() })),
}).superRefine((evidence, ctx) => {
  const total = evidence.fuentes.length;
  for (const [kind, items] of [['facts', evidence.facts], ['conflicts', evidence.conflicts]] as const) {
    items.forEach((item, index) => item.references.forEach((ref, refIndex) => {
      if (ref >= total) ctx.addIssue({ code: 'custom', message: `Referencia ${ref} fuera de rango`, path: [kind, index, 'references', refIndex] });
    }));
  }
});

// ---------------------------------------------------------------- v2

export const EVIDENCE_STATUSES = ['new', 'under_review', 'confirmed', 'reported', 'conflicted', 'expired', 'rejected'] as const;
export type EvidenceStatus = typeof EVIDENCE_STATUSES[number];
export const SOURCE_KINDS = ['official_site', 'official_social', 'direct_confirmation', 'official_registry', 'operator_observation', 'legacy'] as const;
export type SourceKind = typeof SOURCE_KINDS[number];
/** Fuentes que no tienen URL pública: la confirmación directa, la observación propia y el dato heredado. */
const URL_OPTIONAL_KINDS: readonly SourceKind[] = ['direct_confirmation', 'operator_observation', 'legacy'];

const isoInstant = z.iso.datetime(); // UTC con sufijo Z
const isoDate = z.iso.date();
const shortText = z.string().trim().min(1).max(280);
const sourceId = z.string().regex(/^[A-Za-z0-9_-]{1,32}$/, 'id de fuente inválido');
// Ruta en la ficha: "telefono1", "schedule_v1.days.1", "location".
const fieldPath = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*$/, 'Ruta de campo inválida');
// Id opaco: sin espacios y sin series de 8+ dígitos (evita guardar teléfonos; Ley 8968, P7).
const opaqueReference = z.string().regex(/^[A-Za-z0-9._:-]{1,64}$/, 'Referencia opaca inválida').refine((value) => !/\d{8,}/.test(value), 'La referencia no puede contener números telefónicos');
// Códigos sin valores de Google/Brave: "hours_mismatch:0,6", "inaccessible:js_required", "coord_drift_150".
const checkCode = z.string().regex(/^[a-z][a-z0-9_]*(?::(?:[0-6](?:,[0-6])*|[a-z][a-z_]*))?$/, 'Código de comprobación inválido').refine((value) => !/\d{4,}/.test(value), 'Un código no puede llevar valores');

export const locationFactValueSchema = z.strictObject({
  lat: z.number(),
  lng: z.number(),
  location_source: z.enum(STORABLE_LOCATION_SOURCES),
});

const sourceSchema = z.strictObject({
  id: sourceId,
  kind: z.enum(SOURCE_KINDS),
  url: httpsUrl.optional(),
  platform: z.enum(['facebook', 'instagram', 'whatsapp', 'tiktok', 'web']).optional(),
  method: z.enum(['whatsapp', 'telefono', 'correo', 'formulario', 'presencial', 'navegador_dueno', 'motor']).optional(),
  reference: opaqueReference.optional(),
  consultedAt: isoInstant,
  publishedAt: isoInstant.optional(),
  capturedBy: z.enum(['engine', 'owner', 'operator', 'clinic']),
  note: shortText.optional(),
}).superRefine((source, ctx) => {
  if (!source.url && !URL_OPTIONAL_KINDS.includes(source.kind)) ctx.addIssue({ code: 'custom', message: `La fuente ${source.kind} requiere url`, path: ['url'] });
  if (source.kind === 'direct_confirmation') {
    if (!source.reference) ctx.addIssue({ code: 'custom', message: 'La confirmación directa requiere reference', path: ['reference'] });
    if (!source.method) ctx.addIssue({ code: 'custom', message: 'La confirmación directa requiere method', path: ['method'] });
  }
});

const factSchema = z.strictObject({
  field: fieldPath,
  value: z.unknown(),
  status: z.enum(EVIDENCE_STATUSES),
  confidence: confidenceSchema,
  sources: z.array(sourceId).min(1),
  observedAt: isoInstant,
  reviewBy: isoDate,
}).superRefine((fact, ctx) => {
  if (fact.field === 'location' && !locationFactValueSchema.safeParse(fact.value).success)
    ctx.addIssue({ code: 'custom', message: 'location exige {lat, lng, location_source} con fuente almacenable', path: ['value'] });
});

const conflictSchema = z.strictObject({
  field: fieldPath,
  values: z.array(z.unknown()).min(1),
  sources: z.array(sourceId).min(1),
  status: z.enum(['open', 'resolved']),
  resolution: z.string().trim().min(1).max(500).optional(),
}).superRefine((conflict, ctx) => {
  if (conflict.status === 'resolved' && !conflict.resolution) ctx.addIssue({ code: 'custom', message: 'Un conflicto resuelto requiere resolution', path: ['resolution'] });
});

export const evidenceV2Schema = z.strictObject({
  schemaVersion: z.literal(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  observedAt: isoInstant,
  identity: z.strictObject({
    googlePlaceId: googlePlaceIdSchema.optional(),
    placeIdCheckedAt: isoDate.optional(),
    matchMethod: z.string().trim().min(1).max(120).optional(),
    branchNote: shortText.optional(),
  }),
  sources: z.array(sourceSchema),
  facts: z.array(factSchema),
  conflicts: z.array(conflictSchema),
  checks: z.array(z.strictObject({
    provider: z.enum(['google_places', 'official_site', 'brave_search']),
    checkedAt: isoInstant,
    outcome: z.enum(['match', 'discrepancy', 'not_found', 'closed_temporarily', 'closed_permanently', 'inaccessible', 'skipped']),
    codes: z.array(checkCode),
  })),
  pending: z.array(z.strictObject({ field: fieldPath, level: z.union([z.literal(2), z.literal(3)]), action: shortText })),
  externalRefs: z.strictObject({ emergencyAccess: z.string().regex(/^research\/emergency-access-evidence\.json#[a-z0-9-]+$/).optional() }).optional(),
}).superRefine((evidence, ctx) => {
  const kinds = new Map<string, SourceKind>();
  evidence.sources.forEach((source, index) => {
    if (kinds.has(source.id)) ctx.addIssue({ code: 'custom', message: `Fuente duplicada: ${source.id}`, path: ['sources', index, 'id'] });
    kinds.set(source.id, source.kind);
  });
  for (const [kind, items] of [['facts', evidence.facts], ['conflicts', evidence.conflicts]] as const) {
    items.forEach((item, index) => item.sources.forEach((id, refIndex) => {
      if (!kinds.has(id)) ctx.addIssue({ code: 'custom', message: `Fuente inexistente: ${id}`, path: [kind, index, 'sources', refIndex] });
    }));
  }
  // Un hecho confirmado necesita al menos una fuente almacenable distinta del legado (P2).
  evidence.facts.forEach((fact, index) => {
    if (fact.status === 'confirmed' && !fact.sources.some((id) => kinds.has(id) && kinds.get(id) !== 'legacy'))
      ctx.addIssue({ code: 'custom', message: `${fact.field}: confirmed sin fuente verificable`, path: ['facts', index, 'sources'] });
  });
  const ref = evidence.externalRefs?.emergencyAccess;
  if (ref && !ref.endsWith(`#${evidence.slug}`)) ctx.addIssue({ code: 'custom', message: 'externalRefs.emergencyAccess debe apuntar al mismo slug', path: ['externalRefs', 'emergencyAccess'] });
});

export const evidenceSchema = z.discriminatedUnion('schemaVersion', [evidenceV1Schema, evidenceV2Schema]);
export type EvidenceV1 = z.output<typeof evidenceV1Schema>;
export type EvidenceV2 = z.output<typeof evidenceV2Schema>;
export type Evidence = z.output<typeof evidenceSchema>;
export type EvidenceFact = EvidenceV2['facts'][number];

/** Valida un sidecar contra el slug de su ficha. Devuelve mensajes legibles en vez de lanzar. */
export function parseEvidence(raw: unknown, slug: string): { success: true; data: Evidence } | { success: false; errors: string[] } {
  const parsed = evidenceSchema.safeParse(raw);
  if (!parsed.success) return { success: false, errors: parsed.error.issues.map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`) };
  if (parsed.data.slug !== slug) return { success: false, errors: [`slug: se esperaba ${slug} y llegó ${parsed.data.slug}`] };
  return { success: true, data: parsed.data };
}

// ---------------------------------------------------------------- frescura (§4.5, D9)

/** Vigencia máxima de un hecho `confirmed`, en días. Propuesta sujeta a D9. */
export const FRESHNESS_DAYS = { schedule: 180, phone: 365, emergency: 90, location: 730, services: 365 } as const;
export type FreshnessGroup = keyof typeof FRESHNESS_DAYS;

const FRESHNESS_FIELDS: Record<FreshnessGroup, readonly string[]> = {
  schedule: ['schedule_v1', 'horarioTexto'],
  phone: ['telefono1', 'telefono2', 'whatsapp'],
  emergency: ['emergencias24h', 'emergency_tier', 'overnight_doctor_present', 'accepts_emergency_walkins'],
  location: ['location', 'latitude', 'longitude', 'direccion'],
  services: ['atiendeExoticos', 'atiendeGranja', 'atiendePeces', 'hotelMascotas', 'cirugiaEmergencia', 'has_surgery', 'has_hospitalization'],
};

/** `schedule_v1.days.1` pertenece a `schedule_v1`. */
function fieldIn(field: string, fields: readonly string[]) {
  return fields.some((candidate) => field === candidate || field.startsWith(`${candidate}.`));
}

export function freshnessGroup(field: string): FreshnessGroup | null {
  for (const group of Object.keys(FRESHNESS_FIELDS) as FreshnessGroup[]) if (fieldIn(field, FRESHNESS_FIELDS[group])) return group;
  return null;
}

/** Fecha local de Costa Rica (UTC−6, sin horario de verano) en formato YYYY-MM-DD. */
export function costaRicaDate(date: Date): string {
  return new Date(date.getTime() - 6 * 3600_000).toISOString().slice(0, 10);
}

function addDays(isoDay: string, days: number) {
  return new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** `reviewBy` efectivo: el declarado, pero nunca más allá de la vigencia de la política. */
export function effectiveReviewBy(fact: Pick<EvidenceFact, 'field' | 'observedAt' | 'reviewBy'>): string {
  const group = freshnessGroup(fact.field);
  if (!group) return fact.reviewBy;
  const cap = addDays(costaRicaDate(new Date(fact.observedAt)), FRESHNESS_DAYS[group]);
  return fact.reviewBy < cap ? fact.reviewBy : cap;
}

export function isCurrentConfirmed(fact: EvidenceFact, now: Date): boolean {
  return fact.status === 'confirmed' && costaRicaDate(now) <= effectiveReviewBy(fact);
}

// ---------------------------------------------------------------- derivación (§4.6)

export const VERIFICATION_SOURCE_LABELS = {
  direct_confirmation: 'Confirmación directa de la clínica',
  official_site: 'Sitio oficial',
  official_social: 'Publicación oficial de la clínica',
  official_registry: 'Registro oficial',
  none: 'Sin fuente verificable',
} as const;
export type VerificationSourceLabel = typeof VERIFICATION_SOURCE_LABELS[keyof typeof VERIFICATION_SOURCE_LABELS];
const SOURCE_RANK: readonly (keyof typeof VERIFICATION_SOURCE_LABELS)[] = ['direct_confirmation', 'official_site', 'official_social', 'official_registry'];

export interface VerificationDerivation {
  phone_verified: boolean;
  address_verified: boolean;
  schedule_verified: boolean;
  last_verified: string;
  verification_source: VerificationSourceLabel;
  record_status: 'VERIFIED' | 'PARTIAL' | 'REVIEW_REQUIRED';
  officially_confirmed: boolean;
}

const PHONE_FIELDS = ['telefono1', 'telefono2', 'whatsapp'];
const LOCATION_FIELDS = ['location'];
const ADDRESS_FIELDS = ['location', 'direccion'];
const SCHEDULE_FIELDS = ['schedule_v1'];

/**
 * Deriva los campos de verificación de la ficha a partir de la evidencia, sin intervención
 * manual. Sin evidencia (o con v1, que no declara estado por hecho) nada queda verificado.
 * Un grupo está verificado si tiene al menos un hecho `confirmed` vigente y ningún hecho
 * `conflicted` ni conflicto abierto en sus campos.
 */
export function deriveVerification(evidence: Evidence | null | undefined, now: Date): VerificationDerivation {
  const v2 = evidence?.schemaVersion === 2 ? evidence : null;
  const facts = v2?.facts ?? [];
  const openConflicts = (v2?.conflicts ?? []).filter((conflict) => conflict.status === 'open');
  const current = facts.filter((fact) => isCurrentConfirmed(fact, now));
  const verified = (fields: readonly string[]) =>
    current.some((fact) => fieldIn(fact.field, fields))
    && !facts.some((fact) => fact.status === 'conflicted' && fieldIn(fact.field, fields))
    && !openConflicts.some((conflict) => fieldIn(conflict.field, fields));

  const phone = verified(PHONE_FIELDS);
  const location = verified(LOCATION_FIELDS);
  const schedule = verified(SCHEDULE_FIELDS);
  const core = current.filter((fact) => fieldIn(fact.field, [...PHONE_FIELDS, ...LOCATION_FIELDS, ...SCHEDULE_FIELDS]));
  const kinds = new Map((v2?.sources ?? []).map((source) => [source.id, source.kind] as const));
  const coreKinds = new Set(core.flatMap((fact) => fact.sources.map((id) => kinds.get(id))));
  const best = SOURCE_RANK.find((kind) => coreKinds.has(kind as SourceKind)) ?? 'none';

  const closed = (v2?.checks ?? []).some((check) => check.outcome.startsWith('closed_')
    || check.codes.some((code) => code.startsWith('closed_') || code === 'hours_24_conflict'));
  const conflicted = openConflicts.length > 0 || facts.some((fact) => fact.status === 'conflicted');

  return {
    phone_verified: phone,
    address_verified: verified(ADDRESS_FIELDS),
    schedule_verified: schedule,
    last_verified: core.map((fact) => costaRicaDate(new Date(fact.observedAt))).sort().at(-1) ?? '',
    verification_source: VERIFICATION_SOURCE_LABELS[best],
    record_status: conflicted || closed ? 'REVIEW_REQUIRED' : phone && location && schedule ? 'VERIFIED' : 'PARTIAL',
    officially_confirmed: current.some((fact) => fact.sources.some((id) => kinds.get(id) === 'direct_confirmation')),
  };
}

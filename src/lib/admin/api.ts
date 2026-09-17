import { getCollection } from "astro:content";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { clinicSchema, scheduleSchema } from "../clinic-schema.ts";
import { serializeSchedule } from "../schedule.ts";
import { validIdempotencyKey } from "./auth.ts";
import { isOverrideUnexpired, parseOverrideExpiration } from "../override-utils.ts";

export const ADMIN_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
};
type Database = D1Database;
type LiveState = {
  liveState: "AVAILABLE" | "UNCONFIRMED";
  reason: "scheduled" | "live_unavailable";
};
type Override = {
  slug: string;
  temporarilyClosed: boolean;
  message: string | null;
  schedule: unknown;
  expiresAt: string | null;
  revision: number;
};
type CatalogItem = {
  slug: string;
  id: string;
  nombre: string;
  provincia: string;
  zona: string;
  estado: string;
  phone_verified: boolean;
  address_verified: boolean;
  schedule_verified: boolean;
  emergency_verified: boolean;
  problems: Array<{
    code: string;
    field: string;
    explanation: string;
    references: unknown[];
  }>;
  clinic: z.infer<typeof clinicSchema>;
  sourceHash: string;
  operationalState?: LiveState;
  alert?: Override | null;
  pendingReports?: number;
};
export type AdminErrorCode =
  | "NOT_FOUND"
  | "LIVE_UNAVAILABLE"
  | "INVALID_QUERY"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "REQUEST_IN_PROGRESS";

export function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...ADMIN_HEADERS, ...extra },
  });
}
export function fail(
  status: number,
  error: AdminErrorCode | string,
  message?: string,
  extra: Record<string, string> = {},
) {
  return json(
    {
      success: false,
      error,
      ...(message ? { message } : {}),
      requestId: crypto.randomUUID(),
    },
    status,
    extra,
  );
}
function database(): Database | null {
  return (env as unknown as { DB?: Database }).DB ?? null;
}
async function rateLimit(db: Database, subject: string) {
  try {
    const now = Math.floor(Date.now() / 1000);
    await db.prepare("INSERT INTO admin_rate_buckets (subject, window_started, count) VALUES (?, ?, 1) ON CONFLICT(subject) DO UPDATE SET count = CASE WHEN admin_rate_buckets.window_started < ? - 60 THEN 1 ELSE admin_rate_buckets.count + 1 END, window_started = CASE WHEN admin_rate_buckets.window_started < ? - 60 THEN ? ELSE admin_rate_buckets.window_started END").bind(subject, now, now, now, now).run();
    const row = await db.prepare("SELECT count FROM admin_rate_buckets WHERE subject = ?").bind(subject).first<{ count: number }>();
    return Number(row?.count || 0) > 30 ? fail(429, 'RATE_LIMITED', 'Demasiadas mutaciones; inténtalo de nuevo.', { 'Retry-After': '60' }) : undefined;
  } catch { return fail(503, 'LIVE_UNAVAILABLE', 'El límite de mutaciones no está configurado.'); }
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(bytes)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
};
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
const requestHash = (request: Request, body: unknown) => sha256(`${request.method}\n${new URL(request.url).pathname}\n${canonical(body)}`);
const clinicRawSources = import.meta.glob("../../content/clinicas/*.{md,mdx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const evidenceRawSources = import.meta.glob("../../../research/clinics/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
async function gitBlobSha(raw: string) {
  const bytes = new TextEncoder().encode(raw);
  const header = new TextEncoder().encode(`blob ${bytes.byteLength}\0`);
  const payload = new Uint8Array(header.byteLength + bytes.byteLength);
  payload.set(header);
  payload.set(bytes, header.byteLength);
  const digest = await crypto.subtle.digest("SHA-1", payload);
  return [...new Uint8Array(digest)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
async function sourceBlobSha(slug: string) {
  const key = Object.keys(clinicRawSources).find((path) =>
    path.endsWith(`/${slug}.md`) || path.endsWith(`/${slug}.mdx`),
  );
  return key ? gitBlobSha(clinicRawSources[key]) : null;
}
function rawEvidence(slug: string) {
  const key = Object.keys(evidenceRawSources).find((path) =>
    path.endsWith(`/${slug}.json`),
  );
  if (!key) return null;
  try {
    return JSON.parse(evidenceRawSources[key]) as unknown;
  } catch {
    return null;
  }
}
function rawBodyMarkdown(slug: string) {
  const key = Object.keys(clinicRawSources).find((path) =>
    path.endsWith(`/${slug}.md`) || path.endsWith(`/${slug}.mdx`),
  );
  if (!key) return "";
  const parts = clinicRawSources[key].split(/^---\s*$/m);
  return parts.length >= 3 ? parts.slice(2).join("---").replace(/^\r?\n/, "") : "";
}
const baseCommit = () => {
  const values = env as unknown as {
    ADMIN_BASE_COMMIT?: string;
    CF_PAGES_COMMIT_SHA?: string;
  };
  return values.ADMIN_BASE_COMMIT || values.CF_PAGES_COMMIT_SHA || null;
};
async function verifyGithubSource(slug: string, expectedCommit: string, expectedBlob: string | null) {
  const values = env as unknown as { GITHUB_API_URL?: string; GITHUB_REPOSITORY?: string; GITHUB_TOKEN?: string };
  if (!values.GITHUB_API_URL || !values.GITHUB_REPOSITORY || !values.GITHUB_TOKEN)
    return { configured: false, commit: false, blob: null as string | null };
  const api = values.GITHUB_API_URL.replace(/\/$/, "");
  const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${values.GITHUB_TOKEN}` };
  try {
    const commitResponse = await fetch(`${api}/repos/${values.GITHUB_REPOSITORY}/commits/${encodeURIComponent(expectedCommit)}`, { headers });
    if (!commitResponse.ok) return { configured: true, commit: false, blob: null };
    const commit = (await commitResponse.json()) as { sha?: unknown };
    if (commit.sha !== expectedCommit) return { configured: true, commit: false, blob: null };
    if (expectedBlob === null) return { configured: true, commit: true, blob: null };
    for (const extension of ["md", "mdx"]) {
      const path = `src/content/clinicas/${slug}.${extension}`;
      const response = await fetch(`${api}/repos/${values.GITHUB_REPOSITORY}/contents/${path}?ref=${encodeURIComponent(expectedCommit)}`, { headers });
      if (!response.ok) continue;
      const content = (await response.json()) as { sha?: unknown };
      return { configured: true, commit: true, blob: typeof content.sha === "string" ? content.sha : null };
    }
    return { configured: true, commit: true, blob: null };
  } catch {
    return { configured: true, commit: false, blob: null };
  }
}

function safeHttps(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.hostname.includes(".") &&
      !["localhost", "127.0.0.1", "::1"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}
function validUtcDate(value: unknown) {
  return typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value));
}
function validSidecar(
  value: unknown,
  slug: string,
): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const sidecar = value as Record<string, unknown>;
  if (
    Object.keys(sidecar).sort().join(",") !==
      "conflicts,facts,fuentes,observedAt,schemaVersion,slug" ||
    sidecar.schemaVersion !== 1 ||
    sidecar.slug !== slug ||
    !validUtcDate(sidecar.observedAt)
  )
    return false;
  const sources = sidecar.fuentes;
  if (
    !Array.isArray(sources) ||
    !sources.every((source) => {
      if (!source || typeof source !== "object") return false;
      const item = source as Record<string, unknown>;
      return (
        Object.keys(item).every((key) =>
          ["url", "tipo", "consultedAt", "publishedAt"].includes(key),
        ) &&
        safeHttps(item.url) &&
        typeof item.tipo === "string" &&
        (!("consultedAt" in item) || validUtcDate(item.consultedAt)) &&
        (!("publishedAt" in item) || validUtcDate(item.publishedAt))
      );
    })
  )
    return false;
  if (!Array.isArray(sidecar.facts) || !Array.isArray(sidecar.conflicts))
    return false;
  return (
    sidecar.facts.every((fact) => {
      if (!fact || typeof fact !== "object") return false;
      const item = fact as Record<string, unknown>;
      return (
        Object.keys(item).sort().join(",") ===
          "confidence,field,references,value" &&
        typeof item.field === "string" &&
        Array.isArray(item.references) &&
        item.references.every(
          (ref) => Number.isInteger(ref) && ref >= 0 && ref < sources.length,
        ) &&
        ["high", "medium", "low"].includes(String(item.confidence))
      );
    }) &&
    sidecar.conflicts.every((conflict) => {
      if (!conflict || typeof conflict !== "object") return false;
      const item = conflict as Record<string, unknown>;
      return (
        Object.keys(item).sort().join(",") ===
          "field,references,resolution,values" &&
        typeof item.field === "string" &&
        Array.isArray(item.values) &&
        Array.isArray(item.references) &&
        item.references.every(
          (ref) => Number.isInteger(ref) && ref >= 0 && ref < sources.length,
        ) &&
        typeof item.resolution === "string"
      );
    })
  );
}
function clinicFieldsComplete(clinic: Record<string, unknown>, isNew: boolean) {
  const required = [
    "id",
    "nombre",
    "provincia",
    "zona",
    "direccion",
    "horarioTexto",
    "categoriaHorario",
    "emergencias24h",
    "atiendeExoticos",
    "cirugiaEmergencia",
    "atiendeGranja",
    "atiendePeces",
    "hotelMascotas",
    "has_surgery",
    "has_hospitalization",
    "overnight_doctor_present",
    "accepts_emergency_walkins",
    "slug",
    "estado",
    "copyDiferenciador",
  ];
  const knownFields = new Set(Object.keys(clinicSchema.shape));
  return (
    required.every((field) => field in clinic) &&
    Object.keys(clinic).every((field) => knownFields.has(field)) &&
    (!isNew || typeof clinic.id === "string") &&
    clinicSchema.safeParse(clinic).success
  );
}
function deriveScheduleFields(clinic: Record<string, unknown>) {
  if (!clinic.schedule_v1) return clinic;
  const parsed = scheduleSchema.safeParse(clinic.schedule_v1);
  if (!parsed.success) return clinic;
  const schedule = parsed.data;
  const serialized = serializeSchedule(schedule);
  const allDay = schedule.exceptions.length === 0 && schedule.days.every((day) =>
    day.kind === "open" && day.intervals.length === 1 && day.intervals[0].start === 0 && day.intervals[0].end === 1440,
  );
  const closesAfterNine = schedule.days.some((day) =>
    day.kind === "open" && day.intervals.some((interval) => interval.end > 21 * 60),
  );
  return {
    ...clinic,
    horarioTexto: serialized.horarioTexto,
    categoriaHorario: clinic.emergencias24h === true && allDay
      ? "24/7 Emergencias"
      : closesAfterNine
        ? "Cierra después 21h"
        : "Horario normal",
  };
}
function hasLocationEvidence(
  sidecar: Record<string, unknown>,
  clinic: Record<string, unknown>,
) {
  const facts = Array.isArray(sidecar.facts) ? sidecar.facts : [];
  return (
    facts.some((fact) => {
      if (!fact || typeof fact !== "object") return false;
      return ["direccion", "address", "latitude", "longitude", "location"].includes(
        String((fact as Record<string, unknown>).field),
      );
    }) &&
    Number.isFinite(Number(clinic.latitude)) &&
    Number.isFinite(Number(clinic.longitude))
  );
}

async function catalogItems(): Promise<CatalogItem[]> {
  const entries = await getCollection("clinicas");
  return Promise.all(
    entries.map(async (entry) => {
      const clinic = clinicSchema.parse({ ...entry.data, id: entry.id });
      const sourceHash = await sourceBlobSha(clinic.slug);
      if (!sourceHash) throw new Error(`No se pudo calcular el blob SHA de ${clinic.slug}`);
      return {
        slug: clinic.slug,
        id: String(clinic.id),
        nombre: clinic.nombre,
        provincia: clinic.provincia,
        zona: clinic.zona,
        estado: clinic.estado,
        phone_verified: clinic.phone_verified,
        address_verified: clinic.address_verified,
        schedule_verified: clinic.schedule_verified,
        emergency_verified: clinic.emergency_verified,
        problems: [
          ...(clinic.schedule_v1
            ? []
            : [
                {
                  code: "horario",
                  field: "schedule_v1",
                  explanation: "Horario estructurado por confirmar.",
                  references: [],
                },
              ]),
          ...(clinic.latitude === 0 || clinic.longitude === 0
            ? [
                {
                  code: "coordenadas",
                  field: "latitude",
                  explanation: "Ubicación sin coordenadas confirmadas.",
                  references: [],
                },
              ]
            : []),
          ...(clinic.record_status === "REVIEW_REQUIRED"
            ? [
                {
                  code: "evidencia",
                  field: "record_status",
                  explanation: "Requiere revisión de evidencia.",
                  references: [],
                },
              ]
            : []),
        ],
        clinic,
        sourceHash,
      };
    }),
  );
}

async function liveIndex(db: Database) {
  const overrides = new Map<string, Override>();
  const reports = new Map<string, number>();
  const overrideRows = await db
    .prepare(
      "SELECT clinic_slug as slug, is_temporarily_closed as temporarilyClosed, override_status_text as message, schedule_json as schedule, expires_at as expiresAt, revision FROM admin_overrides WHERE active = 1",
    )
    .all<Record<string, unknown>>();
  for (const row of overrideRows.results) {
    if (!isOverrideUnexpired(row.expiresAt)) continue;
    overrides.set(String(row.slug), {
      slug: String(row.slug),
      temporarilyClosed: Boolean(row.temporarilyClosed),
      message: row.message ? String(row.message) : null,
      schedule: row.schedule ? JSON.parse(String(row.schedule)) : null,
      expiresAt: row.expiresAt ? String(row.expiresAt) : null,
      revision: Number(row.revision),
    });
  }
  const reportRows = await db
    .prepare(
      "SELECT r.clinic_slug as slug, COUNT(*) as total FROM reports r LEFT JOIN admin_report_state s ON s.report_id = r.id WHERE COALESCE(s.status, 'new') != 'resolved' GROUP BY r.clinic_slug",
    )
    .all<{ slug: string; total: number }>();
  for (const row of reportRows.results)
    reports.set(row.slug, Number(row.total));
  return { overrides, reports };
}
function parseLimit(value: string | null) {
  const n = value ? Number(value) : 25;
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
}
function parseCursor(value: string | null) {
  if (!value) return 0;
  try {
    const n = Number(atob(value));
    return Number.isInteger(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

export async function listClinics(url: URL) {
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseCursor(url.searchParams.get("cursor"));
  if (limit === null || offset === null)
    return fail(422, "INVALID_QUERY", "limit o cursor inválido");
  const q = normalize(url.searchParams.get("q") || "");
  if (q.length > 100)
    return fail(422, "INVALID_QUERY", "q supera 100 caracteres");
  const allowedStates = new Set([
    "pendiente",
    "publicado",
    "verificado",
    "inactivo",
  ]);
  const allowedIssues = new Set([
    "horario",
    "datos",
    "coordenadas",
    "evidencia",
    "conflicto",
  ]);
  // Empty controls are normal browser form output. Ignore them before
  // validating the allow-list so a blank, optional filter is not a 422.
  const states = url.searchParams.getAll("estado").filter(Boolean);
  const issues = url.searchParams.getAll("issue").filter(Boolean);
  const verification = url.searchParams.getAll("verification").filter(Boolean);
  const alerts = url.searchParams.getAll("alerts").filter(Boolean);
  const reportFilters = url.searchParams.getAll("reports").filter(Boolean);
  if (
    states.some((v) => !allowedStates.has(v)) ||
    issues.some((v) => !allowedIssues.has(v)) ||
    verification.some((v) => v !== "pending") ||
    alerts.some((v) => v !== "active") ||
    reportFilters.some((v) => v !== "pending")
  )
    return fail(422, "INVALID_QUERY", "Filtro administrativo inválido");
  const hasLiveFilter = alerts.length > 0 || reportFilters.length > 0;
  const db = database();
  if (hasLiveFilter && !db)
    return fail(
      503,
      "LIVE_UNAVAILABLE",
      "El estado live no está disponible. Intenta de nuevo.",
    );
  let live: {
    overrides: Map<string, Override>;
    reports: Map<string, number>;
  } | null = null;
  let liveState: LiveState = {
    liveState: "UNCONFIRMED",
    reason: "live_unavailable",
  };
  if (db) {
    try {
      live = await liveIndex(db);
      liveState = { liveState: "AVAILABLE", reason: "scheduled" };
    } catch {
      if (hasLiveFilter)
        return fail(
          503,
          "LIVE_UNAVAILABLE",
          "El estado live no está disponible. Intenta de nuevo.",
        );
    }
  }
  let items = await catalogItems();
  items = items.map((item) => ({
    ...item,
    operationalState: liveState,
    ...(live
      ? {
          alert: live.overrides.get(item.slug) ?? null,
          pendingReports: live.reports.get(item.slug) ?? 0,
        }
      : {}),
  }));
  items = items.filter(
    (item) =>
      (!q ||
        [item.nombre, item.slug, item.zona].some((v) =>
          normalize(v).includes(q),
        )) &&
      (!url.searchParams.get("provincia") ||
        item.provincia === url.searchParams.get("provincia")) &&
      (!states.length || states.includes(item.estado)) &&
      (!verification.length ||
        item.phone_verified === false ||
        item.address_verified === false ||
        item.schedule_verified === false ||
        item.emergency_verified === false) &&
      (!issues.length ||
        issues.some((issue) =>
          issue === "datos"
            ? item.problems.length > 0
            : item.problems.some((problem) => problem.code === issue),
        )) &&
      (!alerts.length || Boolean(item.alert)) &&
      (!reportFilters.length || Number(item.pendingReports) > 0),
  );
  items.sort(
    (a, b) =>
      normalize(a.nombre).localeCompare(normalize(b.nombre), "es") ||
      a.slug.localeCompare(b.slug) ||
      a.id.localeCompare(b.id),
  );
  const totalFiltered = items.length;
  const page = items
    .slice(offset, offset + limit)
    .map(({ clinic: _clinic, ...item }) => item);
  return json({
    items: page,
    nextCursor:
      offset + limit < totalFiltered ? btoa(String(offset + limit)) : null,
    baseCommit: baseCommit(),
    generatedAt: new Date().toISOString(),
    counts: { totalFiltered },
  });
}

async function detailData(slug: string) {
  const all = await catalogItems();
  const item = all.find((candidate) => candidate.slug === slug);
  if (!item) return null;
  const db = database();
  let override: Override | null = null;
  let state: LiveState = {
    liveState: "UNCONFIRMED",
    reason: "live_unavailable",
  };
  let revision = 0;
  if (db) {
    try {
      const live = await liveIndex(db);
      override = live.overrides.get(slug) ?? null;
      const row = await db
        .prepare("SELECT revision FROM admin_overrides WHERE clinic_slug = ?")
        .bind(slug)
        .first<{ revision: number }>();
      revision = Number(row?.revision || 0);
      state = { liveState: "AVAILABLE", reason: "scheduled" };
    } catch {
      /* explicit unconfirmed state */
    }
  }
  return { item, override, state, revision };
}
export async function clinicDetail(slug: string) {
  const detail = await detailData(slug);
  if (!detail) return fail(404, "NOT_FOUND", "Ficha no encontrada");
  const candidateSidecar = rawEvidence(slug);
  const sidecar = candidateSidecar && validSidecar(candidateSidecar, slug)
    ? candidateSidecar
    : null;
  const blobSha = await sourceBlobSha(slug);
  return json({
    clinic: detail.item.clinic,
    bodyMarkdown: rawBodyMarkdown(slug),
    evidence: {
      status: sidecar ? "complete" : "unavailable",
      sidecar,
    },
    blobSha: blobSha || null,
    baseCommit: baseCommit(),
    sourceHash: blobSha || null,
    overrideRevision: detail.revision,
    operationalState: detail.state,
    override: detail.override,
    proposal: null,
  });
}

async function reserveIdempotency(
  db: Database,
  subject: string,
  key: string,
  method: string,
  path: string,
  payloadHash: string,
) {
  const pending = JSON.stringify({ success: false, error: "REQUEST_IN_PROGRESS" });
  const result = await db
    .prepare(
      "INSERT OR IGNORE INTO admin_idempotency (subject, idempotency_key, method, path, payload_hash, status, response_json, created_at) VALUES (?, ?, ?, ?, ?, 102, ?, datetime('now'))",
    )
    .bind(subject, key, method, path, payloadHash, pending)
    .run();
  if (Number(result.meta?.changes || 0) === 1) return null;
  const row = await db
    .prepare(
      "SELECT payload_hash as payloadHash, status, response_json as responseJson FROM admin_idempotency WHERE subject = ? AND idempotency_key = ?",
    )
    .bind(subject, key)
    .first<{ payloadHash: string; status: number; responseJson: string }>();
  if (!row) return fail(503, "LIVE_UNAVAILABLE", "No se pudo reservar la solicitud.");
  if (row.payloadHash !== payloadHash)
    return fail(409, "IDEMPOTENCY_CONFLICT", "La clave ya fue usada con otro payload.");
  if (Number(row.status) === 102)
    return fail(409, "REQUEST_IN_PROGRESS", "La solicitud anterior sigue en progreso.", { "Retry-After": "1" });
  return json(JSON.parse(row.responseJson), Number(row.status), { "Idempotency-Replayed": "true" });
}
async function completeReserved(
  db: Database,
  subject: string,
  key: string,
  status: number,
  response: Response,
) {
  await db
    .prepare(
      "UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102",
    )
    .bind(status, await response.clone().text(), subject, key)
    .run();
}
function currentJson(row: Record<string, unknown> | null) {
  return row
    ? {
        temporarilyClosed: Boolean(row.is_temporarily_closed),
        message: row.override_status_text ?? null,
        schedule: row.schedule_json
          ? JSON.parse(String(row.schedule_json))
          : null,
        expiresAt: row.expires_at ?? null,
        revision: Number(row.revision || 0),
      }
    : null;
}

export async function saveOverride(
  request: Request,
  slug: string,
  subject: string,
  remove = false,
) {
  const db = database();
  if (!db) return fail(503, "LIVE_UNAVAILABLE", "D1 no está configurado.");
  const detail = await detailData(slug);
  if (!detail) return fail(404, "NOT_FOUND", "Ficha no encontrada");
  const limited = await rateLimit(db, subject);
  if (limited) return limited;
  const key = request.headers.get("Idempotency-Key");
  if (!validIdempotencyKey(key))
    return fail(400, "VALIDATION_ERROR", "Idempotency-Key UUID inválida");
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const expectedRevision =
    body && typeof body.expectedRevision === "number"
      ? body.expectedRevision
      : NaN;
  if (!body || !Number.isInteger(expectedRevision) || expectedRevision < 0)
    return fail(422, "VALIDATION_ERROR", "expectedRevision requerido");
  if (!remove) {
    if (
      typeof body.temporarilyClosed !== "boolean" ||
      typeof body.message !== "string" ||
      body.message.length > 500 ||
      (body.schedule !== null &&
        !scheduleSchema.safeParse(body.schedule).success)
    )
      return fail(422, "VALIDATION_ERROR", "Datos de alerta inválidos");
    const expiry = body.expiresAt === null ? null : parseOverrideExpiration(body.expiresAt);
    if (body.expiresAt !== null && expiry === null)
      return fail(422, "VALIDATION_ERROR", "expiresAt inválido");
    if (body.temporarilyClosed) {
      if (typeof body.expiresAt !== "string")
        return fail(
          422,
          "VALIDATION_ERROR",
          "expiresAt es obligatorio para una alerta activa",
        );
      if (
        expiry === null ||
        expiry <= Date.now() ||
        expiry > Date.now() + 7 * 86400000
      )
        return fail(
          422,
          "VALIDATION_ERROR",
          "expiresAt debe estar dentro de los próximos 7 días",
        );
    }
  }
  const payloadHash = await requestHash(request, body);
  const path = new URL(request.url).pathname;
  const replay = await reserveIdempotency(db, subject, key!, request.method, path, payloadHash);
  if (replay) return replay;
  try {
    const row = await db
      .prepare("SELECT * FROM admin_overrides WHERE clinic_slug = ?")
      .bind(slug)
      .first<Record<string, unknown>>();
    const revision = Number(row?.revision || 0);
    if (revision !== expectedRevision) {
      const conflict = fail(409, "CONFLICT", "La ficha cambió; recarga y reaplica.", {
        "x-current-revision": String(revision),
      });
      await completeReserved(db, subject, key!, conflict.status, conflict);
      return conflict;
    }
    if (remove && !row) {
      const response = json({
        success: true,
        slug,
        revision: 0,
        expiresAt: null,
        checkedAt: new Date().toISOString(),
      });
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO override_audit (event_id, clinic_slug, revision, actor_sub, before_json, after_json) VALUES (?, ?, 0, ?, NULL, NULL)").bind(crypto.randomUUID(), slug, subject),
        db.prepare("UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102").bind(response.status, await response.clone().text(), subject, key),
      ]);
      return response;
    }
    const next = revision + 1;
    const active = remove ? 0 : (body!.temporarilyClosed || String(body!.message).trim().length > 0 || body!.schedule !== null) ? 1 : 0;
    const message = remove ? null : body!.message;
    const schedule = remove
      ? null
      : body!.schedule === null
        ? null
        : JSON.stringify(body!.schedule);
    const expiresAt = remove ? null : body!.expiresAt;
    const after = {
      temporarilyClosed: Boolean(active),
      message,
      schedule: body?.schedule ?? null,
      expiresAt: expiresAt ?? null,
      revision: next,
    };
    const response = json({
      success: true,
      slug,
      revision: next,
      expiresAt: expiresAt ?? null,
      checkedAt: new Date().toISOString(),
    });
    const statements = row ? [
      db.prepare("UPDATE admin_overrides SET is_temporarily_closed = ?, override_status_text = ?, schedule_json = ?, expires_at = ?, revision = ?, updated_by = ?, active = ?, updated_at = datetime('now') WHERE clinic_slug = ? AND revision = ?").bind(active, message, schedule, expiresAt, next, subject, active, slug, expectedRevision),
      db.prepare("INSERT INTO override_audit (event_id, clinic_slug, revision, actor_sub, before_json, after_json) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM admin_overrides WHERE clinic_slug = ? AND revision = ?)").bind(crypto.randomUUID(), slug, next, subject, JSON.stringify(currentJson(row)), JSON.stringify(after), slug, next),
      db.prepare("UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102 AND EXISTS (SELECT 1 FROM admin_overrides WHERE clinic_slug = ? AND revision = ?)").bind(response.status, await response.clone().text(), subject, key, slug, next),
    ] : [
      db.prepare("INSERT INTO admin_overrides (clinic_slug, is_temporarily_closed, override_status_text, schedule_json, expires_at, revision, updated_by, active) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE ? = 0").bind(slug, active, message, schedule, expiresAt, next, subject, active, expectedRevision),
      db.prepare("INSERT INTO override_audit (event_id, clinic_slug, revision, actor_sub, before_json, after_json) SELECT ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM admin_overrides WHERE clinic_slug = ? AND revision = ?)").bind(crypto.randomUUID(), slug, next, subject, JSON.stringify(null), JSON.stringify(after), slug, next),
      db.prepare("UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102 AND EXISTS (SELECT 1 FROM admin_overrides WHERE clinic_slug = ? AND revision = ?)").bind(response.status, await response.clone().text(), subject, key, slug, next),
    ];
    const results = await db.batch(statements);
    if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1 || Number(results[2]?.meta?.changes || 0) !== 1) {
      const response = fail(409, "CONFLICT", "La ficha cambió; recarga y reaplica.");
      await completeReserved(db, subject, key!, response.status, response);
      return response;
    }
    return response;
  } catch {
    const response = fail(503, "LIVE_UNAVAILABLE", "D1 no está listo para mutaciones.");
    await completeReserved(db, subject, key!, response.status, response);
    return response;
  }
}

export async function proposal(request: Request, subject: string) {
  const db = database();
  if (!db)
    return fail(
      503,
      "LIVE_UNAVAILABLE",
      "La propuesta requiere D1 configurado.",
    );
  const limited = await rateLimit(db, subject);
  if (limited) return limited;
  const key = request.headers.get("Idempotency-Key");
  if (!validIdempotencyKey(key))
    return fail(400, "VALIDATION_ERROR", "Idempotency-Key UUID inválida");
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    typeof body.slug !== "string" ||
    typeof body.newClinic !== "boolean" ||
    typeof body.baseCommit !== "string" ||
    !body.baseCommit ||
    body.baseCommit === "unknown" ||
    !("blobSha" in body) ||
    typeof body.clinic !== "object" ||
    body.clinic === null ||
    Array.isArray(body.clinic) ||
    !validSidecar(body.evidence, body.slug)
  )
    return fail(
      422,
      "VALIDATION_ERROR",
      "Paquete de propuesta incompleto o inválido",
    );
  if (
    "bodyMarkdown" in body &&
    (typeof body.bodyMarkdown !== "string" || body.bodyMarkdown.length > 60_000)
  )
    return fail(422, "VALIDATION_ERROR", "El cuerpo Markdown no es válido.");
  const isNew = body.newClinic;
  const blobSha = body.blobSha;
  const knownBase = baseCommit();
  if (!knownBase || body.baseCommit !== knownBase)
    return fail(
      409,
      "CONFLICT",
      "La revisión base ya no coincide con main; recarga la ficha.",
    );
  if (
    (isNew && blobSha !== null) ||
    (!isNew &&
      (typeof blobSha !== "string" || !/^[0-9a-f]{40,64}$/.test(blobSha)))
  )
    return fail(
      422,
      "VALIDATION_ERROR",
      "blobSha no corresponde al tipo de propuesta",
    );
  let clinic = body.clinic as Record<string, unknown>;
  const catalog = await catalogItems();
  const existing = catalog.find((item) => item.slug === body.slug);
  if (isNew && existing) return fail(409, "CONFLICT", "El slug ya existe.");
  if (!isNew && !existing) return fail(404, "NOT_FOUND", "Ficha no encontrada");
  if (!isNew) {
    const entries = await getCollection("clinicas");
    const sourceEntry = entries.find((entry) => entry.data.slug === body.slug);
    if (!sourceEntry) return fail(404, "NOT_FOUND", "Ficha no encontrada");
    // The client may submit only edited fields. Merge onto the validated
    // published record so the runner cannot erase omitted metadata.
    body.clinic = deriveScheduleFields({
      ...clinicSchema.parse({ ...sourceEntry.data, id: sourceEntry.id }),
      ...clinic,
    });
    clinic = body.clinic as Record<string, unknown>;
  } else {
    clinic = body.clinic = deriveScheduleFields(clinic);
  }
  if (
    !clinicFieldsComplete(clinic, isNew) ||
    clinic.slug !== body.slug ||
    (isNew &&
      (!/^[-a-z0-9]+$/.test(body.slug) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
          String(clinic.id),
        ) ||
        clinic.latitude === null ||
        clinic.longitude === null ||
        (Number(clinic.latitude) === 0 && Number(clinic.longitude) === 0)))
  ) {
    return fail(
      422,
      "VALIDATION_ERROR",
      "La ficha no cumple el contrato canónico",
    );
  }
  if (isNew && !hasLocationEvidence(body.evidence as Record<string, unknown>, clinic))
    return fail(
      422,
      "VALIDATION_ERROR",
      "La ficha nueva requiere evidencia de ubicación y sucursal.",
    );
  for (const field of ["web", "facebook", "instagram", "waze_url", "maps_url"])
    if (clinic[field] && !safeHttps(clinic[field]))
      return fail(422, "VALIDATION_ERROR", `URL inválida en ${field}`);
  if (!isNew && existing && blobSha !== existing.sourceHash)
    return fail(
      409,
      "CONFLICT",
      "El contenido fuente cambió; recarga la ficha antes de proponer.",
    );
  const github = await verifyGithubSource(
    body.slug,
    body.baseCommit,
    isNew ? null : String(blobSha),
  );
  if (!github.configured)
    return fail(
      503,
      "LIVE_UNAVAILABLE",
      "La verificación GitHub no está configurada; la propuesta queda sin encolar.",
    );
  if (!github.commit)
    return fail(503, "LIVE_UNAVAILABLE", "No se pudo verificar el commit base en GitHub.");
  if (!isNew && github.blob !== blobSha)
    return fail(409, "CONFLICT", "El blob fuente cambió en GitHub; recarga la ficha.");
  const payloadHash = await requestHash(request, body);
  const path = new URL(request.url).pathname;
  const replay = await reserveIdempotency(db, subject, key!, request.method, path, payloadHash);
  if (replay) return replay;
  const operationId = crypto.randomUUID();
  try {
    const response = json({ operationId, prUrl: null, status: "pending" }, 202);
    const results = await db.batch([
      db.prepare("INSERT INTO clinic_proposals (operation_id, subject, idempotency_key, payload_hash, slug, base_commit, expected_blob_sha, payload_json, status, retryable, attempts, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, 0, datetime('now'))").bind(operationId, subject, key, payloadHash, body.slug, body.baseCommit, blobSha, JSON.stringify(body)),
      db.prepare("UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102").bind(response.status, await response.clone().text(), subject, key),
    ]);
    if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
      const failed = fail(503, "LIVE_UNAVAILABLE", "No se pudo registrar la propuesta de forma atómica.");
      await completeReserved(db, subject, key!, failed.status, failed);
      return failed;
    }
    return response;
  } catch {
    const failed = fail(503, "LIVE_UNAVAILABLE", "El outbox de propuestas no está migrado; no se creó una operación.");
    await completeReserved(db, subject, key!, failed.status, failed);
    return failed;
  }
}
export async function operation(operationId: string, subject: string) {
  const db = database();
  if (!db) return fail(503, "LIVE_UNAVAILABLE", "Operaciones no disponibles.");
  const limited = await rateLimit(db, subject);
  if (limited) return limited;
  try {
    const row = await db
      .prepare(
        "SELECT operation_id as operationId, status, status as stage, attempts, pr_url as prUrl, error_code as errorCode, retryable, updated_at as updatedAt FROM clinic_proposals WHERE operation_id = ? AND subject = ?",
      )
      .bind(operationId, subject)
      .first();
    return row ? json(row) : fail(404, "NOT_FOUND", "Operación no encontrada");
  } catch {
    return fail(503, "LIVE_UNAVAILABLE", "El outbox no está migrado.");
  }
}
export async function retryOperation(
  request: Request,
  operationId: string,
  subject: string,
) {
  const db = database();
  if (!db) return fail(503, "LIVE_UNAVAILABLE", "Operaciones no disponibles.");
  const key = request.headers.get("Idempotency-Key");
  if (!validIdempotencyKey(key))
    return fail(400, "VALIDATION_ERROR", "Idempotency-Key UUID inválida");
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.reason !== "string" || !body.reason.trim())
    return fail(422, "VALIDATION_ERROR", "Motivo requerido");
  const hash = await requestHash(request, body);
  const path = new URL(request.url).pathname;
  try {
    const row = await db
      .prepare(
        "SELECT status, retryable FROM clinic_proposals WHERE operation_id = ? AND subject = ?",
      )
      .bind(operationId, subject)
      .first<{ status: string; retryable: number }>();
    if (!row) return fail(404, "NOT_FOUND", "Operación no encontrada");
    if (row.status !== "failed" || !row.retryable)
      return fail(409, "CONFLICT", "La operación no es recuperable.");
    const replay = await reserveIdempotency(db, subject, key!, request.method, path, hash);
    if (replay) return replay;
    const response = json({ operationId, status: "pending", prUrl: null });
    const results = await db.batch([
      db
        .prepare(
          "UPDATE clinic_proposals SET status = 'pending', error_code = NULL, retryable = 0, updated_at = datetime('now') WHERE operation_id = ? AND subject = ? AND status = 'failed'",
        )
        .bind(operationId, subject),
      db
        .prepare(
          "UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102",
        )
        .bind(
          response.status,
          await response.clone().text(),
          subject,
          key,
        ),
    ]);
    if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
      const failed = fail(409, "CONFLICT", "La operación cambió; reintenta después de recargar.");
      await completeReserved(db, subject, key!, failed.status, failed);
      return failed;
    }
    return response;
  } catch {
    const failed = fail(503, "LIVE_UNAVAILABLE", "No se pudo reintentar la operación.");
    await completeReserved(db, subject, key!, failed.status, failed);
    return failed;
  }
}
export async function reports(url: URL) {
  const db = database();
  if (!db) return fail(503, "LIVE_UNAVAILABLE", "Reportes no disponibles.");
  const status = url.searchParams.get("status");
  if (status && !["new", "reviewed", "resolved"].includes(status))
    return fail(422, "INVALID_QUERY", "Estado de reporte inválido");
  const slug = url.searchParams.get("slug");
  if (slug && !/^[-a-z0-9]+$/.test(slug))
    return fail(422, "INVALID_QUERY", "Slug de reporte inválido");
  const limit = parseLimit(url.searchParams.get("limit"));
  const offset = parseCursor(url.searchParams.get("cursor"));
  if (limit === null || offset === null)
    return fail(422, "INVALID_QUERY", "limit o cursor inválido");
  try {
    const conditions: string[] = [];
    const values: string[] = [];
    if (status) {
      conditions.push("COALESCE(s.status, 'new') = ?");
      values.push(status);
    }
    if (slug) {
      conditions.push("r.clinic_slug = ?");
      values.push(slug);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT r.id, r.clinic_slug as slug, r.clinic_name as clinicName, r.reason, r.description, r.contact, r.created_at as createdAt, COALESCE(s.status, 'new') as status, COALESCE(s.revision, 0) as revision, s.resolution_note as resolutionNote FROM reports r LEFT JOIN admin_report_state s ON s.report_id = r.id ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`;
    const result = await db
      .prepare(query)
      .bind(...values, limit + 1, offset)
      .all();
    const items = result.results.slice(0, limit);
    return json({
      items,
      nextCursor: result.results.length > limit ? btoa(String(offset + limit)) : null,
    });
  } catch {
    return fail(
      503,
      "LIVE_UNAVAILABLE",
      "La tabla de reportes no está migrada.",
    );
  }
}
export async function patchReport(
  request: Request,
  id: string,
  subject: string,
) {
  const db = database();
  if (!db) return fail(503, "LIVE_UNAVAILABLE", "Reportes no disponibles.");
  const limited = await rateLimit(db, subject);
  if (limited) return limited;
  const key = request.headers.get("Idempotency-Key");
  if (!validIdempotencyKey(key))
    return fail(400, "VALIDATION_ERROR", "Idempotency-Key UUID inválida");
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !body ||
    !Number.isInteger(body.expectedRevision) ||
    !["new", "reviewed", "resolved"].includes(String(body.status)) ||
    typeof body.resolutionNote !== "string" ||
    body.resolutionNote.length > 2000
  )
    return fail(422, "VALIDATION_ERROR", "Estado o revisión inválidos");
  const hash = await requestHash(request, body);
  const path = new URL(request.url).pathname;
  try {
    // Reserve before reading mutable state. A retry with the same key must
    // replay the original response even after the report revision advanced.
    const replay = await reserveIdempotency(db, subject, key!, request.method, path, hash);
    if (replay) return replay;
    const exists = await db
      .prepare("SELECT id FROM reports WHERE id = ?")
      .bind(id)
      .first();
    if (!exists) {
      const failed = fail(404, "NOT_FOUND", "Reporte no encontrado");
      await completeReserved(db, subject, key!, failed.status, failed);
      return failed;
    }
    const current = await db
      .prepare("SELECT revision FROM admin_report_state WHERE report_id = ?")
      .bind(id)
      .first<{ revision: number }>();
    const revision = Number(current?.revision || 0);
    if (revision !== body.expectedRevision) {
      const failed = fail(409, "CONFLICT", "El reporte cambió; recarga y reaplica.");
      await completeReserved(db, subject, key!, failed.status, failed);
      return failed;
    }
    const next = revision + 1;
    const response = json({
      success: true,
      id,
      revision: next,
      status: body.status,
    });
    const results = await db.batch([
      db
        .prepare(
          "INSERT INTO admin_report_state (report_id, status, revision, reviewed_by, reviewed_at, resolution_note) VALUES (?, ?, ?, ?, datetime('now'), ?) ON CONFLICT(report_id) DO UPDATE SET status = excluded.status, revision = excluded.revision, reviewed_by = excluded.reviewed_by, reviewed_at = excluded.reviewed_at, resolution_note = excluded.resolution_note WHERE admin_report_state.revision = ?",
        )
        .bind(
          id,
          body.status,
          next,
          subject,
          body.resolutionNote,
          body.expectedRevision,
        ),
      db
        .prepare(
          "UPDATE admin_idempotency SET status = ?, response_json = ? WHERE subject = ? AND idempotency_key = ? AND status = 102 AND EXISTS (SELECT 1 FROM admin_report_state WHERE report_id = ? AND revision = ? AND reviewed_by = ?)",
        )
        .bind(
          response.status,
          await response.clone().text(),
          subject,
          key,
          id,
          next,
          subject,
        ),
    ]);
    if (Number(results[0]?.meta?.changes || 0) !== 1 || Number(results[1]?.meta?.changes || 0) !== 1) {
      const failed = fail(409, "CONFLICT", "El reporte cambió; recarga y reaplica.");
      await completeReserved(db, subject, key!, failed.status, failed);
      return failed;
    }
    return response;
  } catch {
    const failed = fail(
      503,
      "LIVE_UNAVAILABLE",
      "La tabla de reportes no está migrada.",
    );
    await completeReserved(db, subject, key!, failed.status, failed);
    return failed;
  }
}

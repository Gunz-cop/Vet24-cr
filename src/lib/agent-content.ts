import { normalizeSlug, SITE_ORIGIN } from "./seo.ts";

export const AGENT_TIME_ZONE = "America/Costa_Rica";

export const AGENT_WARNINGS = [
  "Confirma por teléfono el horario y la atención antes de trasladarte; este catálogo no informa disponibilidad en tiempo real.",
  "Una capacidad afirmada refleja lo registrado en la ficha; no confirmado no significa que el servicio no exista.",
  "Lee las notas y el texto de la ficha: los servicios pueden tener restricciones de especie, horario o reserva.",
] as const;

export const CAPABILITY_KEYS = [
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
] as const;

// Keep the catalog's zone normalization aligned with getClinicZoneSlug from
// zones.ts. This local lookup also keeps the pure adapter importable by the
// repository's plain node:test runner, which does not resolve Astro's
// extensionless internal imports.
const ZONE_ALIASES: Record<string, string> = {
  guapiles: "guapiles",
  "san-pablo-de-heredia": "san-pablo-heredia",
  "san-pablo-heredia": "san-pablo-heredia",
  grecia: "grecia",
  "grecia-centro": "grecia",
  nicoya: "nicoya",
  "nicoya-centro": "nicoya",
  "san-ramon": "san-ramon",
  "san-ramon-centro": "san-ramon",
  curridabat: "curridabat",
  siquirres: "siquirres",
};

type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export interface AgentClinicData {
  [key: string]: unknown;
  id?: number | string;
  nombre?: string;
  provincia?: string;
  zona?: string;
  direccion?: string;
  telefono1?: string;
  telefono2?: string;
  whatsapp?: string;
  horarioTexto?: string;
  categoriaHorario?: string;
  emergencias24h?: boolean;
  atiendeExoticos?: boolean;
  cirugiaEmergencia?: boolean;
  atiendeGranja?: boolean;
  atiendePeces?: boolean;
  hotelMascotas?: boolean;
  hotelVerificacion?: string;
  hotelFuente?: string;
  confidence_score?: string;
  record_status?: string;
  emergency_tier?: string;
  last_verified?: string;
  phone_verified?: boolean;
  address_verified?: boolean;
  schedule_verified?: boolean;
  emergency_verified?: boolean;
  has_surgery?: boolean;
  has_hospitalization?: boolean;
  overnight_doctor_present?: boolean;
  accepts_emergency_walkins?: boolean;
  verification_notes?: string[];
  verification_source?: string;
  latitude?: number;
  longitude?: number;
  waze_url?: string;
  maps_url?: string;
  web?: string;
  facebook?: string;
  instagram?: string;
  slug?: string;
  estado?: string;
  copyDiferenciador?: string;
}

export interface AgentClinicEntry {
  data: AgentClinicData;
  body?: string;
}

export interface AgentClinic {
  slug: string;
  url: string;
  nombre: string | null;
  provincia: string | null;
  zona: string | null;
  direccion: string | null;
  provinciaSlug: string | null;
  zonaSlug: string | null;
  telefono1: string | null;
  telefono2: string | null;
  whatsapp: string | null;
  web: string | null;
  facebook: string | null;
  instagram: string | null;
  waze_url: string | null;
  maps_url: string | null;
  horarioTexto: string | null;
  categoriaHorario: string | null;
  openNow: null;
  latitude: number | null;
  longitude: number | null;
  copyDiferenciador: string | null;
  bodyMarkdown: string;
  estado: string | null;
  confidence_score: string | null;
  record_status: string | null;
  emergency_tier: string | null;
  last_verified: string | null;
  verification_source: string | null;
  hotelFuente: string | null;
  verification_notes: string[];
  phone_verified: boolean;
  address_verified: boolean;
  schedule_verified: boolean;
  emergency_verified: boolean;
  hotelVerificacion: string | null;
  capacidades: Record<CapabilityKey, { valorRegistrado: boolean; estado: "afirmado" | "no-confirmado" }>;
  advertencias: readonly string[];
}

function nullableText(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function registeredBoolean(value: unknown): boolean {
  return value === true;
}

function agentZoneSlug(zona: string): string {
  const normalized = normalizeSlug(zona);
  return ZONE_ALIASES[normalized] ?? normalized;
}

function capability(value: unknown) {
  const valorRegistrado = registeredBoolean(value);
  return { valorRegistrado, estado: valorRegistrado ? "afirmado" as const : "no-confirmado" as const };
}

function validCoordinates(data: AgentClinicData): [number | null, number | null] {
  const latitude = data.latitude;
  const longitude = data.longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || (latitude === 0 && longitude === 0)) {
    return [null, null];
  }
  return [latitude as number, longitude as number];
}

export function toAgentClinic(entry: AgentClinicEntry): AgentClinic {
  const data = entry.data;
  const slug = typeof data.slug === "string" ? data.slug : "";
  const [latitude, longitude] = validCoordinates(data);
  const capacidades = Object.fromEntries(
    CAPABILITY_KEYS.map((key) => [key, capability(data[key])]),
  ) as AgentClinic["capacidades"];

  return {
    slug,
    url: `${SITE_ORIGIN}/clinica/${slug}/`,
    nombre: nullableText(data.nombre),
    provincia: nullableText(data.provincia),
    zona: nullableText(data.zona),
    direccion: nullableText(data.direccion),
    provinciaSlug: typeof data.provincia === "string" ? normalizeSlug(data.provincia) : null,
    zonaSlug: typeof data.zona === "string" ? agentZoneSlug(data.zona) : null,
    telefono1: nullableText(data.telefono1),
    telefono2: nullableText(data.telefono2),
    whatsapp: nullableText(data.whatsapp),
    web: nullableText(data.web),
    facebook: nullableText(data.facebook),
    instagram: nullableText(data.instagram),
    waze_url: nullableText(data.waze_url),
    maps_url: nullableText(data.maps_url),
    horarioTexto: nullableText(data.horarioTexto),
    categoriaHorario: nullableText(data.categoriaHorario),
    openNow: null,
    latitude,
    longitude,
    copyDiferenciador: nullableText(data.copyDiferenciador),
    bodyMarkdown: typeof entry.body === "string" ? entry.body : "",
    estado: nullableText(data.estado),
    confidence_score: nullableText(data.confidence_score),
    record_status: nullableText(data.record_status),
    emergency_tier: nullableText(data.emergency_tier),
    last_verified: nullableText(data.last_verified),
    verification_source: nullableText(data.verification_source),
    hotelFuente: nullableText(data.hotelFuente),
    verification_notes: Array.isArray(data.verification_notes) ? [...data.verification_notes] : [],
    phone_verified: data.phone_verified === true,
    address_verified: data.address_verified === true,
    schedule_verified: data.schedule_verified === true,
    emergency_verified: data.emergency_verified === true,
    hotelVerificacion: nullableText(data.hotelVerificacion),
    capacidades,
    advertencias: AGENT_WARNINGS,
  };
}

export function buildAgentCatalog(entries: AgentClinicEntry[]) {
  return {
    schemaVersion: "1" as const,
    timeZone: AGENT_TIME_ZONE,
    clinics: entries.map(toAgentClinic).sort((a, b) => a.slug.localeCompare(b.slug)),
  };
}

export const agentClinicOpenApiSchema = {
  type: "object",
  required: [
    "slug", "url", "nombre", "provincia", "zona", "direccion", "provinciaSlug", "zonaSlug",
    "telefono1", "telefono2", "whatsapp", "web", "facebook", "instagram", "waze_url", "maps_url",
    "horarioTexto", "categoriaHorario", "openNow", "latitude", "longitude", "copyDiferenciador",
    "bodyMarkdown", "estado", "confidence_score", "record_status", "emergency_tier", "last_verified",
    "verification_source", "hotelFuente", "verification_notes", "phone_verified", "address_verified",
    "schedule_verified", "emergency_verified", "hotelVerificacion", "capacidades", "advertencias",
  ],
  properties: {
    slug: { type: "string" },
    url: { type: "string", format: "uri" },
    nombre: { type: ["string", "null"] },
    provincia: { type: ["string", "null"] },
    zona: { type: ["string", "null"] },
    direccion: { type: ["string", "null"] },
    provinciaSlug: { type: ["string", "null"] },
    zonaSlug: { type: ["string", "null"] },
    telefono1: { type: ["string", "null"] },
    telefono2: { type: ["string", "null"] },
    whatsapp: { type: ["string", "null"] },
    web: { type: ["string", "null"] },
    facebook: { type: ["string", "null"] },
    instagram: { type: ["string", "null"] },
    waze_url: { type: ["string", "null"] },
    maps_url: { type: ["string", "null"] },
    horarioTexto: { type: ["string", "null"] },
    categoriaHorario: { type: ["string", "null"] },
    openNow: { type: "null" },
    latitude: { type: ["number", "null"] },
    longitude: { type: ["number", "null"] },
    copyDiferenciador: { type: ["string", "null"] },
    bodyMarkdown: { type: "string" },
    estado: { type: ["string", "null"] },
    confidence_score: { type: ["string", "null"] },
    record_status: { type: ["string", "null"] },
    emergency_tier: { type: ["string", "null"] },
    last_verified: { type: ["string", "null"] },
    verification_source: { type: ["string", "null"] },
    hotelFuente: { type: ["string", "null"] },
    verification_notes: { type: "array", items: { type: "string" } },
    phone_verified: { type: "boolean" },
    address_verified: { type: "boolean" },
    schedule_verified: { type: "boolean" },
    emergency_verified: { type: "boolean" },
    hotelVerificacion: { type: ["string", "null"] },
    capacidades: {
      type: "object",
      required: [...CAPABILITY_KEYS],
      properties: Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, {
        type: "object",
        required: ["valorRegistrado", "estado"],
        properties: {
          valorRegistrado: { type: "boolean" },
          estado: { type: "string", enum: ["afirmado", "no-confirmado"] },
        },
      }])),
    },
    advertencias: { type: "array", items: { type: "string", enum: [...AGENT_WARNINGS] } },
  },
} as const;

export const agentCatalogOpenApiSchema = {
  type: "object",
  required: ["schemaVersion", "timeZone", "clinics"],
  properties: {
    schemaVersion: { type: "string", const: "1" },
    timeZone: { type: "string", const: AGENT_TIME_ZONE },
    clinics: { type: "array", items: agentClinicOpenApiSchema },
  },
} as const;

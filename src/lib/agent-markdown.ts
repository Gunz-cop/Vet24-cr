import {
  AGENT_TIME_ZONE,
  CAPABILITY_KEYS,
  type AgentClinic,
  type AgentClinicEntry,
  buildAgentCatalog,
} from "./agent-content.ts";
import { SITE_ORIGIN } from "./seo.ts";

export type AgentCatalog = ReturnType<typeof buildAgentCatalog>;

export const MIRROR_PROVINCES = [
  { nombre: "San José", slug: "san-jose" },
  { nombre: "Heredia", slug: "heredia" },
  { nombre: "Alajuela", slug: "alajuela" },
  { nombre: "Cartago", slug: "cartago" },
  { nombre: "Guanacaste", slug: "guanacaste" },
  { nombre: "Puntarenas", slug: "puntarenas" },
  { nombre: "Limón", slug: "limon" },
] as const;

export const MIRROR_ZONES = [
  { nombre: "Guápiles", slug: "guapiles" },
  { nombre: "San Pablo de Heredia", slug: "san-pablo-heredia" },
  { nombre: "Grecia", slug: "grecia" },
  { nombre: "Nicoya", slug: "nicoya" },
  { nombre: "San Ramón", slug: "san-ramon" },
  { nombre: "Curridabat", slug: "curridabat" },
  { nombre: "Siquirres", slug: "siquirres" },
] as const;

export type MirrorKind = "index" | "clinic" | "province" | "zone";

export interface MirrorRoute {
  kind: MirrorKind;
  htmlPath: string;
  mirrorPath: string;
}

export interface MarkdownMirror {
  route: MirrorRoute;
  content: string;
}

const CLINIC_PATH = /^\/clinica\/([^/]+)\/$/;
const PROVINCE_PATH = /^\/provincia\/([^/]+)\/$/;
const ZONE_PATH = /^\/zona\/([^/]+)\/$/;

/** Only canonical slash URLs are eligible for content negotiation. */
export function mirrorPathForHtmlPath(pathname: string): MirrorRoute | null {
  if (pathname === "/") {
    return { kind: "index", htmlPath: "/", mirrorPath: "/md/index.md" };
  }

  const clinic = pathname.match(CLINIC_PATH);
  if (clinic) {
    return { kind: "clinic", htmlPath: pathname, mirrorPath: `/md/clinica/${clinic[1]}.md` };
  }

  const province = pathname.match(PROVINCE_PATH);
  if (province) {
    return { kind: "province", htmlPath: pathname, mirrorPath: `/md/provincia/${province[1]}.md` };
  }

  const zone = pathname.match(ZONE_PATH);
  if (zone) {
    return { kind: "zone", htmlPath: pathname, mirrorPath: `/md/zona/${zone[1]}.md` };
  }

  return null;
}

export function isMirrorableHtmlPath(pathname: string): boolean {
  return mirrorPathForHtmlPath(pathname) !== null;
}

export function expectedMirrorRoutes(catalog: AgentCatalog): MirrorRoute[] {
  return [
    mirrorPathForHtmlPath("/")!,
    ...MIRROR_PROVINCES.map(({ slug }) => mirrorPathForHtmlPath(`/provincia/${slug}/`)!),
    ...MIRROR_ZONES.map(({ slug }) => mirrorPathForHtmlPath(`/zona/${slug}/`)!),
    ...catalog.clinics.map(({ slug }) => mirrorPathForHtmlPath(`/clinica/${slug}/`)!),
  ];
}

function registered(value: boolean): string {
  return value ? "sí" : "no";
}

function nullable(value: string | null): string {
  return value ?? "no registrado";
}

function capabilityLines(clinic: AgentClinic): string[] {
  return CAPABILITY_KEYS.map((key) => {
    const capability = clinic.capacidades[key];
    return `- ${key}: ${capability.estado} (valor registrado: ${registered(capability.valorRegistrado)})`;
  });
}

function evidenceLines(clinic: AgentClinic): string[] {
  return [
    `- Estado interno registrado: ${nullable(clinic.estado)}`,
    `- Confianza registrada: ${nullable(clinic.confidence_score)}`,
    `- Estado del registro: ${nullable(clinic.record_status)}`,
    `- Nivel de emergencia registrado: ${nullable(clinic.emergency_tier)}`,
    `- Última verificación registrada: ${nullable(clinic.last_verified)}`,
    `- Fuente de verificación registrada: ${nullable(clinic.verification_source)}`,
    `- Teléfono marcado como verificado: ${registered(clinic.phone_verified)}`,
    `- Dirección marcada como verificada: ${registered(clinic.address_verified)}`,
    `- Horario marcado como verificado: ${registered(clinic.schedule_verified)}`,
    `- Emergencia marcada como verificada: ${registered(clinic.emergency_verified)}`,
    `- Verificación del hotel registrada: ${nullable(clinic.hotelVerificacion)}`,
    `- Fuente del hotel registrada: ${nullable(clinic.hotelFuente)}`,
    `- Notas de verificación: ${clinic.verification_notes.length ? "" : "ninguna registrada"}`,
    ...clinic.verification_notes.map((note) => `  - ${note}`),
  ];
}

function contactLines(clinic: AgentClinic): string[] {
  return [
    `- Teléfono 1: ${nullable(clinic.telefono1)}`,
    `- Teléfono 2: ${nullable(clinic.telefono2)}`,
    `- WhatsApp: ${nullable(clinic.whatsapp)}`,
    `- Web: ${nullable(clinic.web)}`,
    `- Facebook: ${nullable(clinic.facebook)}`,
    `- Instagram: ${nullable(clinic.instagram)}`,
    `- Waze: ${nullable(clinic.waze_url)}`,
    `- Maps: ${nullable(clinic.maps_url)}`,
  ];
}

export function renderClinicMarkdown(clinic: AgentClinic): string {
  const body = clinic.bodyMarkdown || "_Sin cuerpo editorial registrado._";
  return [
    `# ${nullable(clinic.nombre)}`,
    "",
    `URL canónica: ${clinic.url}`,
    "",
    "## Ubicación",
    `- Provincia: ${nullable(clinic.provincia)}`,
    `- Zona: ${nullable(clinic.zona)}`,
    `- Dirección: ${nullable(clinic.direccion)}`,
    `- Coordenadas: ${clinic.latitude === null ? "no registradas" : `${clinic.latitude}, ${clinic.longitude}`}`,
    "",
    "## Contacto",
    ...contactLines(clinic),
    "",
    "## Horario registrado",
    `- Horario: ${nullable(clinic.horarioTexto)}`,
    `- Categoría: ${nullable(clinic.categoriaHorario)}`,
    "- Disponibilidad en tiempo real: no informada (openNow permanece en null).",
    "",
    "## Capacidades registradas",
    ...capabilityLines(clinic),
    "",
    "## Estado y evidencia registrada",
    ...evidenceLines(clinic),
    "",
    "## Advertencias",
    ...clinic.advertencias.map((warning) => `- ${warning}`),
    "",
    "## Texto diferenciador",
    clinic.copyDiferenciador ?? "No registrado.",
    "",
    "## Cuerpo íntegro de la ficha",
    body,
    "",
  ].join("\n");
}

function clinicSummary(clinic: AgentClinic): string[] {
  return [
    `### [${nullable(clinic.nombre)}](${clinic.url})`,
    `- Provincia: ${nullable(clinic.provincia)}; zona: ${nullable(clinic.zona)}`,
    `- Contacto principal: ${nullable(clinic.telefono1)}`,
    `- Horario registrado: ${nullable(clinic.horarioTexto)}`,
    `- Emergencias registradas: ${clinic.capacidades.emergencias24h.estado}`,
    `- Estado del registro: ${nullable(clinic.record_status)}; verificación de horario: ${registered(clinic.schedule_verified)}`,
    "- Disponibilidad en tiempo real: no informada.",
    ...clinic.advertencias.map((warning) => `- Advertencia: ${warning}`),
    "",
  ];
}

function renderListingMarkdown(title: string, description: string, clinics: AgentClinic[]): string {
  return [
    `# ${title}`,
    "",
    description,
    "",
    `Zona horaria del catálogo: ${AGENT_TIME_ZONE}.`,
    "Este espejo es un listado estático de referencia. No calcula ni afirma disponibilidad en tiempo real; confirma por teléfono antes de trasladarte.",
    "",
    "## Clínicas registradas",
    "",
    ...clinics.flatMap(clinicSummary),
  ].join("\n");
}

export function renderIndexMarkdown(catalog: AgentCatalog): string {
  return renderListingMarkdown(
    "Vet24-cr — clínicas veterinarias en Costa Rica",
    "Directorio público de referencia construido desde el catálogo de agentes de Vet24-cr.",
    catalog.clinics,
  );
}

export function renderProvinceMarkdown(catalog: AgentCatalog, province: (typeof MIRROR_PROVINCES)[number]): string {
  const clinics = catalog.clinics.filter((clinic) => clinic.provinciaSlug === province.slug);
  return renderListingMarkdown(`Veterinarias registradas en ${province.nombre}`, `Opciones registradas en la provincia de ${province.nombre}.`, clinics);
}

export function renderZoneMarkdown(catalog: AgentCatalog, zone: (typeof MIRROR_ZONES)[number]): string {
  const clinics = catalog.clinics.filter((clinic) => clinic.zonaSlug === zone.slug);
  return renderListingMarkdown(`Veterinarias registradas en ${zone.nombre}`, `Opciones registradas en la zona de ${zone.nombre}.`, clinics);
}

export function buildMarkdownMirrors(entries: AgentClinicEntry[]): MarkdownMirror[] {
  const catalog = buildAgentCatalog(entries);
  const routes = expectedMirrorRoutes(catalog);
  const clinicBySlug = new Map(catalog.clinics.map((clinic) => [clinic.slug, clinic]));
  const mirrors: MarkdownMirror[] = [];

  for (const route of routes) {
    if (route.kind === "index") {
      mirrors.push({ route, content: renderIndexMarkdown(catalog) });
      continue;
    }

    const slug = route.htmlPath.split("/").at(-2) ?? "";
    if (route.kind === "clinic") {
      const clinic = clinicBySlug.get(slug);
      if (clinic) mirrors.push({ route, content: renderClinicMarkdown(clinic) });
      continue;
    }

    if (route.kind === "province") {
      const province = MIRROR_PROVINCES.find((item) => item.slug === slug);
      if (province) mirrors.push({ route, content: renderProvinceMarkdown(catalog, province) });
      continue;
    }

    const zone = MIRROR_ZONES.find((item) => item.slug === slug);
    if (zone) mirrors.push({ route, content: renderZoneMarkdown(catalog, zone) });
  }

  return mirrors;
}

export function directMirrorUrl(route: MirrorRoute): string {
  return `${SITE_ORIGIN}${route.mirrorPath}`;
}

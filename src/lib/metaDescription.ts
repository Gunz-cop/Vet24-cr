/**
 * Hotfix SEO — metadata sin datos operativos volátiles.
 *
 * PROBLEMA: las meta descriptions de las fichas se construían a partir del
 * estado operativo de la clínica (horario textual, emergencias 24/7, promesas
 * de atención inmediata). Cuando ese dato cambia, la página se corrige el mismo
 * día pero buscadores, cachés y sistemas de IA pueden seguir sirviendo la
 * descripción vieja durante días. Un snippet obsoleto de horario es una
 * afirmación falsa sobre disponibilidad médica.
 *
 * REGLA: la meta description (y sus equivalentes sociales / JSON-LD) se
 * construye únicamente con atributos relativamente estables de la ficha:
 * nombre, zona, provincia y servicios/capacidades registrados. Nada que
 * dependa de la hora actual, del horario declarado ni de una promesa de
 * disponibilidad.
 *
 * Esto NO cambia el contenido visible de la ficha ni la lógica funcional de
 * horarios, filtros o «Abierto ahora»: el horario sigue publicado en la página
 * y en `openingHoursSpecification` del JSON-LD, que es el lugar correcto para
 * el dato factual y estructurado.
 */

export interface ClinicMetaInput {
  nombre: string;
  zona: string;
  provincia: string;
  copyDiferenciador?: string;
  atiendeExoticos?: boolean;
  atiendeGranja?: boolean;
  atiendePeces?: boolean;
  cirugiaEmergencia?: boolean;
  has_surgery?: boolean;
  has_hospitalization?: boolean;
  hotelMascotas?: boolean;
  hotelVerificacion?: string;
}

/**
 * Patrones que NO pueden aparecer en metadata: quedan obsoletos rápido y
 * sobreviven en cachés e índices como si siguieran siendo ciertos.
 */
export const VOLATILE_METADATA_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: "hora con am/pm", pattern: /\b\d{1,2}(?::\d{2})?\s*(?:a\.?\s?m\.?|p\.?\s?m\.?)/i },
  { name: "hora con formato 24h", pattern: /\b\d{1,2}(?::\d{2})\s*(?:h(?:rs?)?)?\b/i },
  { name: "hora abreviada (21h)", pattern: /\b\d{1,2}\s*h(?:rs?)?\b/i },
  { name: "rango horario", pattern: /\b\d{1,2}\s*[-–a]\s*\d{1,2}\s*(?:a\.?\s?m\.?|p\.?\s?m\.?|h)/i },
  { name: "disponibilidad 24/7", pattern: /\b24\s*[/\-x]\s*7\b/i },
  { name: "24 horas", pattern: /\b24\s*(?:horas|hrs)\b/i },
  { name: "días de la semana", pattern: /\b(?:l-d|l-v|lun(?:es)?\s*(?:a|-)\s*(?:dom|vie|sáb|sab))/i },
  { name: "jornada continua", pattern: /jornada continua|horario continuo/i },
  { name: "horario", pattern: /\bhorarios?\b/i },
  { name: "estado de apertura", pattern: /\babiert[oa]s?\b|\bcerrad[oa]s?\b|\babre\b|\bcierra\b/i },
  { name: "disponibilidad inmediata", pattern: /de inmediato|inmediatamente|ahora mismo|llama ahora|atención inmediata|disponibilidad inmediata|al instante/i },
  { name: "guardia / nocturno", pattern: /\bde guardia\b|\bnocturn[oa]s?\b|\btoda la noche\b|\bhoy\b/i },
];

/** Devuelve los nombres de los patrones volátiles encontrados en un texto. */
export function findVolatileMetadata(text: string): string[] {
  return VOLATILE_METADATA_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
}

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

interface ServiceRule {
  label: string;
  match: (copy: string, data: ClinicMetaInput) => boolean;
}

/**
 * Servicios clínicos estables. Se detectan desde los booleanos de la ficha o
 * desde `copyDiferenciador` con una lista blanca de términos: nunca se infiere
 * un servicio que la ficha no mencione, y la ausencia de evidencia jamás se
 * convierte en afirmación negativa (no se escribe «no hace cirugía»).
 */
const CORE_SERVICES: ServiceRule[] = [
  { label: "cirugía", match: (c, d) => d.has_surgery === true || d.cirugiaEmergencia === true || /cirug|quirurgic/.test(c) },
  { label: "internamiento", match: (c, d) => d.has_hospitalization === true || /internamiento|hospitalizaci/.test(c) },
  { label: "laboratorio", match: (c) => /laboratorio/.test(c) },
  { label: "imágenes médicas", match: (c) => /imagenes medicas|rayos x|radiograf|ultrasonido|ecograf/.test(c) },
  { label: "odontología", match: (c) => /odontolog|limpieza dental|limpiezas dentales|dental/.test(c) },
  { label: "farmacia veterinaria", match: (c) => /farmacia/.test(c) },
  { label: "vacunación", match: (c) => /vacuna/.test(c) },
  { label: "estética canina", match: (c) => /peluqueria|grooming|estetica/.test(c) },
];

/** Rasgos diferenciadores estables: lo que distingue una ficha de las demás. */
const DIFFERENTIATOR_SERVICES: ServiceRule[] = [
  {
    label: "hotel exclusivo para gatos",
    match: (c, d) => hasHotel(d) && /(hotel|hospedaje)[^.]{0,60}(exclusiv|solo)[^.]{0,20}gat/.test(c),
  },
  { label: "hotel para mascotas", match: (c, d) => hasHotel(d) },
  { label: "atención de exóticos", match: (c, d) => d.atiendeExoticos === true },
  { label: "animales de granja", match: (c, d) => d.atiendeGranja === true },
  { label: "peces ornamentales", match: (c, d) => d.atiendePeces === true },
  { label: "servicio a domicilio", match: (c) => /a domicilio/.test(c) },
  { label: "ambulancia veterinaria", match: (c) => /ambulancia/.test(c) },
  { label: "cremación", match: (c) => /cremacion/.test(c) },
  { label: "tienda de mascotas", match: (c) => /tienda de mascotas|pet shop/.test(c) },
];

function hasHotel(d: ClinicMetaInput): boolean {
  return d.hotelMascotas === true && d.hotelVerificacion !== "no-confirmado";
}

const pickServices = (rules: ServiceRule[], copy: string, data: ClinicMetaInput) =>
  rules.filter((rule) => rule.match(copy, data)).map((rule) => rule.label);

/** Une una lista en castellano: «a, b y c». */
function joinEs(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Ubicación legible sin repetir la provincia cuando ya está en la zona. */
export function buildLocation(zona: string, provincia: string): string {
  const z = normalize(zona);
  const p = normalize(provincia);
  return z === p || z.includes(p) ? zona : `${zona}, ${provincia}`;
}

const MAX_LENGTH = 165;

/**
 * Selecciona los servicios estables que describen a la clínica (máx. 4):
 * hasta 3 clínicos más al menos un rasgo diferenciador, para que las 112
 * fichas no compartan una plantilla intercambiable.
 */
function selectServices(data: ClinicMetaInput): string[] {
  const copy = normalize(data.copyDiferenciador ?? "");
  const core = pickServices(CORE_SERVICES, copy, data);
  const diff = pickServices(DIFFERENTIATOR_SERVICES, copy, data);

  // Un hotel específico (gatos) desplaza al genérico: no repetir el mismo dato.
  if (diff[0] === "hotel exclusivo para gatos") {
    const generic = diff.indexOf("hotel para mascotas");
    if (generic > -1) diff.splice(generic, 1);
  }

  return [...core.slice(0, 3), ...diff.slice(0, Math.max(1, 4 - Math.min(core.length, 3)))].slice(0, 4);
}

const CTA_WITH_SERVICES = " Consulta dirección y contacto en Vet24.";
const CTA_WITHOUT_SERVICES = " Consulta dirección, teléfonos y datos de contacto en Vet24.";

/**
 * Construye la meta description de una ficha con datos estables.
 *
 * Formato: «{nombre} en {zona}, {provincia}. {servicios}. Consulta dirección
 * y contacto en Vet24.»
 */
export function buildClinicMetaDescription(data: ClinicMetaInput): string {
  const selected = selectServices(data);
  const head = `${data.nombre} en ${buildLocation(data.zona, data.provincia)}.`;

  const compose = (services: string[]) =>
    `${head}${services.length ? ` ${capitalize(joinEs(services))}.` : ""}${
      services.length ? CTA_WITH_SERVICES : CTA_WITHOUT_SERVICES
    }`;

  let list = selected;
  let description = compose(list);

  // Recorta servicios hasta caber en el largo útil de un snippet.
  while (description.length > MAX_LENGTH && list.length > 0) {
    list = list.slice(0, -1);
    description = compose(list);
  }

  // Red de seguridad: si un dato de la ficha introdujera copy volátil (por
  // ejemplo un nombre comercial con horario), se cae a la versión mínima en
  // lugar de publicar una promesa que puede quedar obsoleta.
  if (findVolatileMetadata(description.slice(head.length)).length > 0) {
    description = `${head}${CTA_WITHOUT_SERVICES}`;
  }

  return description;
}

/**
 * Descripción de la entidad para el JSON-LD `LocalBusiness` / `VeterinaryCare`.
 *
 * Misma base estable que la meta description, pero sin el CTA de Vet24: aquí se
 * describe a la clínica, no se invita a navegar el directorio.
 */
export function buildClinicEntityDescription(data: ClinicMetaInput): string {
  const selected = selectServices(data);
  const head = `${data.nombre} en ${buildLocation(data.zona, data.provincia)}.`;
  const services = selected.length > 0 ? ` ${capitalize(joinEs(selected))}.` : "";

  return findVolatileMetadata(services).length > 0 ? head : `${head}${services}`;
}

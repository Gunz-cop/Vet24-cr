import { getCollection } from "astro:content";
import { buildAgentCatalog } from "../lib/agent-content.ts";
import { SITE_ORIGIN } from "../lib/seo.ts";

export const prerender = true;

export async function GET() {
  const entries = await getCollection("clinicas");
  const catalog = buildAgentCatalog(entries);
  const clinicLinks = catalog.clinics.map((clinic) => `- [${clinic.nombre ?? clinic.slug}](${clinic.url})`).join("\n");
  const body = `# Vet24-cr

Directorio público de clínicas veterinarias en Costa Rica. El catálogo contiene los registros publicados por Vet24-cr y conserva sus límites de verificación; no informa disponibilidad en tiempo real.

## Recursos para agentes

- Catálogo JSON: ${SITE_ORIGIN}/api/catalog.json
- OpenAPI: ${SITE_ORIGIN}/api/openapi.json
- Diccionario y ejemplos: ${SITE_ORIGIN}/api/readme.md
- Acceso: ${SITE_ORIGIN}/auth.md
- API Catalog: ${SITE_ORIGIN}/.well-known/api-catalog

## Páginas HTML reales

- Inicio: ${SITE_ORIGIN}/
- Directorio por provincia: ${SITE_ORIGIN}/provincia/heredia/
- Directorio por zona: ${SITE_ORIGIN}/zona/guapiles/
${clinicLinks}

Confirma por teléfono el horario y la atención antes de trasladarte. Filtra el catálogo descargado en tu cliente; no hay filtros ni paginación HTTP.
`;
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

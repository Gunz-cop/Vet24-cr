import { SITE_ORIGIN } from "../../lib/seo.ts";
import { agentCatalogOpenApiSchema } from "../../lib/agent-content.ts";

export const prerender = true;

export async function GET() {
  const document = {
    openapi: "3.1.0",
    info: {
      title: "Vet24-cr public catalog",
      version: "1.0.0",
      description: "Lectura del catálogo público de clínicas veterinarias de Costa Rica.",
    },
    servers: [{ url: SITE_ORIGIN }],
    paths: {
      "/api/catalog.json": {
        get: {
          operationId: "getCatalog",
          summary: "Descargar el catálogo completo",
          responses: {
            "200": {
              description: "Catálogo público completo",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Catalog" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Catalog: agentCatalogOpenApiSchema,
      },
    },
  };
  return new Response(JSON.stringify(document), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

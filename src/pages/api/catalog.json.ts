import { getCollection } from "astro:content";
import { buildAgentCatalog } from "../../lib/agent-content.ts";

export const prerender = true;

export async function GET() {
  const entries = await getCollection("clinicas");
  const catalog = buildAgentCatalog(entries);
  return new Response(JSON.stringify(catalog), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

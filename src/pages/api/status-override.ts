import type { APIRoute } from "astro";
import { adminResponse, methodResponse } from "../../lib/admin/auth.ts";
import { getPublicOverride } from "../../lib/public-overrides.ts";
import { serializeSchedule } from "../../lib/schedule.ts";
export const prerender = false;
export const handleStatusOverride = async (request: Request, runtimeEnv?: { DB?: D1Database }) => {
  const bad = methodResponse(request, "GET, HEAD"); if (bad) return bad;
  const slug = new URL(request.url).searchParams.get("slug");
  // Keep the legacy no-argument probe fail-closed while allowing the public
  // page's slug-scoped read path to use D1.
  if (!slug) return adminResponse(503, request, "LIVE_UNAVAILABLE");
  if (!/^[-a-z0-9]+$/.test(slug)) return adminResponse(400, request, "INVALID_SLUG");
  if (!runtimeEnv?.DB) return adminResponse(503, request, "LIVE_UNAVAILABLE");
  let override;
  try {
    override = await getPublicOverride(slug, runtimeEnv);
  } catch {
    return adminResponse(503, request, "LIVE_UNAVAILABLE");
  }
  const response = new Response(JSON.stringify({ success: true, override: override ? {
    is_temporarily_closed: override.temporarilyClosed,
    override_status_text: override.message,
    override_schedule_text: override.schedule
      ? serializeSchedule(override.schedule).horarioTexto
      : null,
    expires_at: override.expiresAt,
    revision: override.revision,
  } : null }), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  return request.method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
};
export const ALL: APIRoute = ({ request, locals }) => handleStatusOverride(request, (locals as unknown as { runtime?: { env?: { DB?: D1Database } } }).runtime?.env);

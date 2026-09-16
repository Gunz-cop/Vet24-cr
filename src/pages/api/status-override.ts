import type { APIRoute } from "astro";
import { adminResponse, methodResponse } from "../../lib/admin/auth";
export const prerender = false;
export const handleStatusOverride = (request: Request) => {
  const bad = methodResponse(request, "GET, HEAD"); if (bad) return bad;
  return adminResponse(503, request, "LIVE_NOT_READY");
};
export const ALL: APIRoute = ({ request }) => handleStatusOverride(request);

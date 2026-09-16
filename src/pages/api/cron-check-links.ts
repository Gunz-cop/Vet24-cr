import type { APIRoute } from "astro";
export const prerender = false;
export const handleCronCheckLinks = (request: Request) => new Response(request.method === "HEAD" ? null : JSON.stringify({ success: false, error: "GONE" }), { status: 410, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
export const ALL: APIRoute = ({ request }) => handleCronCheckLinks(request);

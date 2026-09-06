import { AGENT_LINK_HEADER } from "./agent-discovery.ts";
import { mirrorPathForHtmlPath } from "./agent-markdown.ts";

export type Representation = "html" | "markdown";

export type AgentHandler<Env = unknown> = (
  request: Request,
  env: Env,
  context: ExecutionContext,
) => Promise<Response>;

function quality(value: string | undefined): number {
  if (value === undefined) return 1;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
}

function acceptedMediaTypes(header: string): Map<string, number> {
  const types = new Map<string, number>();
  for (const part of header.split(",")) {
    const [mediaType, ...parameters] = part.trim().toLowerCase().split(";");
    if (!mediaType) continue;
    const qParameter = parameters.find((parameter) => parameter.trim().startsWith("q="));
    const q = quality(qParameter?.trim().slice(2));
    types.set(mediaType.trim(), Math.max(types.get(mediaType.trim()) ?? 0, q));
  }
  return types;
}

/** A wildcard can make HTML acceptable, but never opts a client into Markdown. */
export function selectRepresentation(accept: string | null): Representation {
  if (!accept || accept.trim() === "") return "html";

  const types = acceptedMediaTypes(accept);
  const markdownQuality = types.get("text/markdown") ?? 0;
  if (markdownQuality <= 0) return "html";

  const explicitHtml = types.get("text/html");
  const wildcardHtml = Math.max(types.get("*/*") ?? 0, types.get("text/*") ?? 0);
  const htmlQuality = explicitHtml ?? (wildcardHtml > 0 ? wildcardHtml : 0);

  return markdownQuality > htmlQuality ? "markdown" : "html";
}

function appendVary(headers: Headers, value: string): void {
  const values = (headers.get("Vary") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  headers.set("Vary", values.join(", "));
}

function negotiatedResponse(request: Request, response: Response, markdown: boolean): Response {
  const headers = new Headers(response.headers);
  appendVary(headers, "Accept");
  headers.set("Cache-Control", "private, no-store");
  headers.delete("X-Robots-Tag");

  if (markdown) {
    headers.set("Content-Type", "text/markdown; charset=utf-8");
    headers.delete("Access-Control-Allow-Origin");
    headers.set("Link", AGENT_LINK_HEADER);
  }

  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function mirrorRequest(request: Request, mirrorPath: string): Request {
  const url = new URL(request.url);
  url.pathname = mirrorPath;
  url.search = "";
  return new Request(url, { method: request.method, headers: request.headers });
}

export async function handleAgentRequest<Env>(
  request: Request,
  env: Env,
  context: ExecutionContext,
  delegate: AgentHandler<Env>,
): Promise<Response> {
  const route = mirrorPathForHtmlPath(new URL(request.url).pathname);
  if (!route || (request.method !== "GET" && request.method !== "HEAD")) {
    return delegate(request, env, context);
  }

  if (selectRepresentation(request.headers.get("Accept")) !== "markdown") {
    return negotiatedResponse(request, await delegate(request, env, context), false);
  }

  try {
    const mirror = await delegate(mirrorRequest(request, route.mirrorPath), env, context);
    if (mirror.status >= 200 && mirror.status < 300) {
      return negotiatedResponse(request, mirror, true);
    }
  } catch {
    // Only a mirror fetch failure is contained; the canonical request remains
    // the official Astro adapter's response and status.
  }

  return negotiatedResponse(request, await delegate(request, env, context), false);
}

import { defineMiddleware } from "astro:middleware";
import { AGENT_LINK_HEADER, isAgentDiscoverableHtmlPath } from "./lib/agent-discovery";

const CANONICAL_HOST = "vet24cr.com";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocalHost) {
    const response = await next();
    if (!isAgentDiscoverableHtmlPath(url.pathname)) return response;
    const headers = new Headers(response.headers);
    headers.set("Link", AGENT_LINK_HEADER);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }

  const isCanonicalHost = url.hostname === CANONICAL_HOST;
  const isHttps = url.protocol === "https:";
  const hasIndex = url.pathname.endsWith("/index.html");
  const isApiCatalog = url.pathname === "/.well-known/api-catalog";
  const needsSlash =
    !url.pathname.endsWith("/") &&
    !url.pathname.includes(".") &&
    url.pathname !== "" &&
    !isApiCatalog;

  if (!isCanonicalHost || !isHttps || hasIndex || needsSlash) {
    url.protocol = "https:";
    url.hostname = CANONICAL_HOST;

    if (hasIndex) {
      url.pathname = url.pathname.slice(0, -"index.html".length);
    }

    if (needsSlash && !url.pathname.endsWith("/")) {
      url.pathname = `${url.pathname}/`;
    }

    return Response.redirect(url, 301);
  }

  const response = await next();
  if (isAgentDiscoverableHtmlPath(url.pathname)) {
    const headers = new Headers(response.headers);
    headers.set("Link", AGENT_LINK_HEADER);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
  return response;
});

import { defineMiddleware } from "astro:middleware";

const CANONICAL_HOST = "vet24cr.com";

export const onRequest = defineMiddleware((context, next) => {
  const url = new URL(context.request.url);
  const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocalHost) {
    return next();
  }

  const isCanonicalHost = url.hostname === CANONICAL_HOST;
  const isHttps = url.protocol === "https:";
  const hasIndex = url.pathname.endsWith("/index.html");
  const needsSlash =
    !url.pathname.endsWith("/") &&
    !url.pathname.includes(".") &&
    url.pathname !== "";

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

  return next();
});

export const SITE_ORIGIN = "https://vet24cr.com";

export function normalizeSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function canonicalUrl(pathname = "/"): string {
  let path = pathname.split("?")[0].split("#")[0] || "/";

  if (path.endsWith("/index.html")) {
    path = path.slice(0, -"index.html".length);
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  if (!path.endsWith("/")) {
    path = `${path}/`;
  }

  return `${SITE_ORIGIN}${path}`;
}

export function absoluteUrl(pathname = "/"): string {
  return canonicalUrl(pathname);
}


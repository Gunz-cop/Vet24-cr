import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const SITEMAP_FILTER_PATTERN = String.raw`[\\/]?(api|auth\.md|llms\.txt|\.well-known|md)([/.]|$)`;

export function extractSitemapFilterPattern(source: string): string {
  const match = source.match(/filter\s*:\s*\([^)]*\)\s*=>\s*!\/(.+)\/\.test/s);
  if (!match) throw new Error('No se pudo extraer el regex real de astro.config.mjs');
  return match[1];
}

export function readConfiguredSitemapFilterPattern(configPath = resolve('astro.config.mjs')): string {
  return extractSitemapFilterPattern(readFileSync(configPath, 'utf8'));
}

export function assertSitemapFilterIsSynchronized(configPath = resolve('astro.config.mjs')): RegExp {
  const configured = readConfiguredSitemapFilterPattern(configPath);
  if (configured !== SITEMAP_FILTER_PATTERN) {
    throw new Error(`Filtro sitemap desincronizado: config=${configured} comprobacion=${SITEMAP_FILTER_PATTERN}`);
  }
  return new RegExp(configured);
}

export function assertBlogRouteAllowed(pathname: string, configPath = resolve('astro.config.mjs')): void {
  const filter = assertSitemapFilterIsSynchronized(configPath);
  assertBlogRouteAllowedByPattern(pathname, filter);
}

export function assertBlogRouteAllowedByPattern(pathname: string, filter = new RegExp(SITEMAP_FILTER_PATTERN)): void {
  const normalized = new URL(pathname, 'https://vet24cr.com').pathname;
  if (filter.test(normalized)) {
    throw new Error(`La ruta de blog ${normalized} queda excluida por el filtro sitemap vigente`);
  }
}

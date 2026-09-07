import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITEMAP_FILTER_PATTERN, assertBlogRouteAllowed, extractSitemapFilterPattern } from '../../src/lib/blog-sitemap.ts';

const cases = [
  ['/blog/', false], ['/blog/guias-por-especie/', false], ['/blog/guias-por-especie/x/', false],
  ['/blog/mdcuidados/', false], ['/blog/md/', true], ['/blog/costos-y-acceso/mdguia/', false],
  ['/blog/costos-y-acceso/rapi/', true], ['/md/index.md', true], ['/api/catalog.json', true],
  ['/auth.md', true], ['/llms.txt', true], ['/.well-known/api-catalog', true],
] as const;

describe('defensa del sitemap', () => {
  test('lee el literal real y exige igualdad exacta', () => {
    const source = readFileSync('astro.config.mjs', 'utf8');
    assert.equal(extractSitemapFilterPattern(source), SITEMAP_FILTER_PATTERN);
    assert.throws(() => extractSitemapFilterPattern('export default {}'), /No se pudo extraer/);
  });

  test('reproduce la tabla contractual de §2', () => {
    const actual = new RegExp(SITEMAP_FILTER_PATTERN);
    for (const [path, excluded] of cases) {
      assert.equal(actual.test(new URL(path, 'https://vet24cr.com').pathname), excluded, path);
    }
  });

  test('acepta piloto y rechaza rapi', () => {
    assert.doesNotThrow(() => assertBlogRouteAllowed('/blog/guias-por-especie/urgencias-en-perros/'));
    assert.throws(() => assertBlogRouteAllowed('/blog/costos-y-acceso/rapi/'), /excluida/);
  });
});

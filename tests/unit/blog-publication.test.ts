import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { blogArticlePath, blogPillarPath, isPublished } from '../../src/lib/blog.ts';

describe('publicación de blog', () => {
  test('rutas canónicas tienen barra final', () => {
    assert.equal(blogPillarPath('guias-por-especie'), '/blog/guias-por-especie/');
    assert.equal(blogArticlePath('costos-y-acceso', 'ejemplo'), '/blog/costos-y-acceso/ejemplo/');
  });

  test('solo estado publicado es público', () => {
    assert.equal(isPublished({ data: { estado: 'borrador' } } as never), false);
    assert.equal(isPublished({ data: { estado: 'publicado' } } as never), true);
  });

  test('el piloto versionado permanece borrador', () => {
    const source = readFileSync('src/content/blog/urgencias-en-perros.md', 'utf8');
    assert.match(source, /^estado: "borrador"$/m);
    assert.doesNotMatch(source, /^datePublished:/m);
  });
});

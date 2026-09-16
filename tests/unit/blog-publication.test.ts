import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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

  test('B4 contiene exactamente cinco artículos publicados y ningún borrador', () => {
    const files = readdirSync('src/content/blog').filter((file) => file.endsWith('.md'));
    assert.deepEqual(files.sort(), [
      'atencion-veterinaria-24h-por-zona.md',
      'atencion-veterinaria-para-exoticos.md',
      'costo-emergencia-veterinaria-nocturna.md',
      'urgencias-en-gatos.md',
      'urgencias-en-perros.md',
    ]);
    for (const file of files) {
      const source = readFileSync(`src/content/blog/${file}`, 'utf8');
      assert.match(source, /^estado: "publicado"$/m, file);
      assert.match(source, /^datePublished: "2026-09-08"$/m, file);
      assert.match(source, /^autor: "Equipo de Vet24cr"$/m, file);
      assert.doesNotMatch(source, /^revisadoPor:/m, file);
      assert.match(source, /no sustituye|no diagnostica|no sustituir/i, file);
    }
  });
});

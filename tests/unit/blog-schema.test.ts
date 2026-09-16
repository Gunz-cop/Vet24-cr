import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { blogSchema } from '../../src/lib/blog.ts';

const validDraft = {
  title: 'Urgencias en perros', seoTitle: 'Urgencias en perros',
  metaDescription: 'Descripción válida.', pilar: 'guias-por-especie',
  slug: 'urgencias-en-perros', estado: 'borrador', autor: 'Equipo de Vet24cr',
};

describe('schema de blog', () => {
  test('acepta borrador sin fecha y aplica borrador por defecto', () => {
    assert.equal(blogSchema.parse({ ...validDraft, estado: undefined }).estado, 'borrador');
  });

  test('publicado exige datePublished ISO', () => {
    assert.throws(() => blogSchema.parse({ ...validDraft, estado: 'publicado' }));
    assert.equal(blogSchema.parse({ ...validDraft, estado: 'publicado', datePublished: '2026-09-07' }).datePublished, '2026-09-07');
    assert.throws(() => blogSchema.parse({ ...validDraft, dateModified: '7/9/2026' }));
    assert.throws(() => blogSchema.parse({ ...validDraft, dateModified: '2026-99-99' }));
  });

  test('strictObject rechaza campos desconocidos y límites inválidos', () => {
    assert.throws(() => blogSchema.parse({ ...validDraft, extra: true }));
    assert.throws(() => blogSchema.parse({ ...validDraft, title: '' }));
    assert.throws(() => blogSchema.parse({ ...validDraft, metaDescription: 'x'.repeat(161) }));
    assert.throws(() => blogSchema.parse({ ...validDraft, pilar: 'emergencias' }));
  });
});

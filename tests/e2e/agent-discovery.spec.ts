import { test, expect } from '../../playwright.config';

const RESOURCES = [
  ['/api/catalog.json', 'application/json'],
  ['/api/openapi.json', 'application/json'],
  ['/llms.txt', 'text/plain'],
  ['/api/readme.md', 'text/markdown'],
  ['/auth.md', 'text/markdown'],
  ['/.well-known/api-catalog', 'application/linkset+json'],
] as const;

test.describe('AR2 — descubrimiento y catálogo público', () => {
  test('GET y HEAD entregan los seis recursos técnicos sin barra final', async ({ request }) => {
    for (const [path, mime] of RESOURCES) {
      const get = await request.get(path);
      expect(get.status(), path).toBe(200);
      expect(get.headers()['content-type'], path).toContain(mime);
      expect(new URL(get.url()).pathname, path).toBe(path);

      const head = await request.head(path);
      expect(head.status(), `HEAD ${path}`).toBe(200);
      expect(head.headers()['content-type'], `HEAD ${path}`).toContain(mime);
      expect(await head.body(), `HEAD ${path}`).toHaveLength(0);
    }
  });

  test('el catálogo y el API Catalog describen recursos reales', async ({ request }) => {
    const catalogResponse = await request.get('/api/catalog.json');
    const catalog = await catalogResponse.json();
    expect(catalog.schemaVersion).toBe('1');
    expect(catalog.timeZone).toBe('America/Costa_Rica');
    expect(catalog.clinics.length).toBeGreaterThan(0);
    expect(catalog.clinics.every((clinic: { openNow: null }) => clinic.openNow === null)).toBe(true);

    const linkset = await (await request.get('/.well-known/api-catalog')).json();
    expect(linkset.anchor).toBe('https://vet24cr.com/api/catalog.json');
    expect(linkset['service-desc']).toEqual([{ href: 'https://vet24cr.com/api/openapi.json' }]);
    expect(linkset['service-doc']).toEqual([{ href: 'https://vet24cr.com/api/readme.md' }]);
  });

  test('OpenAPI solo expone el GET público del catálogo', async ({ request }) => {
    const openapi = await (await request.get('/api/openapi.json')).json();
    expect(openapi.openapi).toBe('3.1.0');
    expect(Object.keys(openapi.paths)).toEqual(['/api/catalog.json']);
    expect(openapi.paths['/api/catalog.json'].get).toBeTruthy();
    expect(openapi.paths['/api/catalog.json'].post).toBeUndefined();
    expect(openapi.paths['/api/catalog.json'].get.parameters).toBeUndefined();
    expect(openapi.paths['/api/catalog.json'].get.security).toBeUndefined();
  });

  test('portada y ficha exponen las cuatro relaciones Link', async ({ request }) => {
    const expected = [
      '</.well-known/api-catalog>; rel="api-catalog"',
      '</api/openapi.json>; rel="service-desc"',
      '</api/readme.md>; rel="service-doc"',
      '</llms.txt>; rel="describedby"',
    ];
    for (const path of ['/', '/clinica/hems-una-heredia/']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const link = response.headers().link ?? '';
      for (const relation of expected) expect(link, `${path} ${relation}`).toContain(relation);
      for (const target of ['/.well-known/api-catalog', '/api/openapi.json', '/api/readme.md', '/llms.txt']) {
        expect((await request.get(target)).status(), target).toBe(200);
      }
    }
  });

  test('el alias de sitemap redirige al índice generado', async ({ request }) => {
    const redirect = await request.get('/sitemap.xml', { maxRedirects: 0 });
    expect(redirect.status()).toBe(301);
    expect(redirect.headers().location).toMatch(/sitemap-index\.xml/);
    expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
  });
});

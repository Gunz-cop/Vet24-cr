import { test, expect } from '../../playwright.config';

const PROVINCES = ['san-jose', 'heredia', 'alajuela', 'cartago', 'guanacaste', 'puntarenas', 'limon'];
const ZONES = ['guapiles', 'san-pablo-heredia', 'grecia', 'nicoya', 'san-ramon', 'curridabat', 'siquirres'];

function canonicalPaths(clinics: Array<{ slug: string }>) {
  return [
    '/',
    ...PROVINCES.map((slug) => `/provincia/${slug}/`),
    ...ZONES.map((slug) => `/zona/${slug}/`),
    ...clinics.map(({ slug }) => `/clinica/${slug}/`),
  ];
}

test.describe('AR3 — mirrors Markdown y negociación', () => {
  test('sirve todas las familias directas y negociadas sin mezclar caché', async ({ request }) => {
    const catalog = await (await request.get('/api/catalog.json')).json();
    const paths = canonicalPaths(catalog.clinics);
    const sitemap = await (await request.get('/sitemap-index.xml')).text();

    for (const htmlPath of paths) {
      const mirrorPath = htmlPath === '/' ? '/md/index.md' : `/md${htmlPath.slice(0, -1)}.md`;
      const markdown = await request.get(htmlPath, { headers: { Accept: 'text/markdown' } });
      expect(markdown.status(), `Markdown ${htmlPath}`).toBe(200);
      expect(markdown.headers()['content-type'], htmlPath).toContain('text/markdown');
      expect(markdown.headers()['vary'], htmlPath).toMatch(/(?:^|,\s*)accept(?:\s*,|$)/i);
      expect(markdown.headers()['cache-control'], htmlPath).toBe('private, no-store');
      expect(markdown.headers()['x-robots-tag'] ?? '', htmlPath).not.toMatch(/noindex/i);

      const html = await request.get(htmlPath, { headers: { Accept: 'text/html, text/markdown;q=0' } });
      expect(html.status(), `HTML ${htmlPath}`).toBe(200);
      expect(html.headers()['content-type'], htmlPath).toContain('text/html');
      expect(html.headers()['cache-control'], htmlPath).toBe('private, no-store');
      expect(html.headers()['vary'], htmlPath).toMatch(/(?:^|,\s*)accept(?:\s*,|$)/i);
      expect(html.headers()['x-robots-tag'] ?? '', htmlPath).not.toMatch(/noindex/i);

      const direct = await request.get(mirrorPath);
      expect(direct.status(), `directo ${mirrorPath}`).toBe(200);
      expect(direct.headers()['content-type'], mirrorPath).toContain('text/markdown');
      expect(direct.headers()['access-control-allow-origin'], mirrorPath).toBe('*');
      expect(direct.headers()['x-robots-tag'], mirrorPath).toMatch(/noindex/i);
      expect(sitemap, mirrorPath).not.toContain(mirrorPath);
    }
  });

  test('HEAD mantiene selección, cabeceras y cuerpo vacío', async ({ request }) => {
    for (const path of ['/', '/clinica/hems-una-heredia/', '/provincia/heredia/', '/zona/guapiles/']) {
      const markdown = await request.head(path, { headers: { Accept: 'text/markdown' } });
      expect(markdown.status(), path).toBe(200);
      expect(markdown.headers()['content-type'], path).toContain('text/markdown');
      expect(markdown.headers()['cache-control'], path).toBe('private, no-store');
      expect(markdown.headers()['x-robots-tag'] ?? '', path).not.toMatch(/noindex/i);
      expect(await markdown.body(), path).toHaveLength(0);

      const html = await request.head(path, { headers: { Accept: 'text/html' } });
      expect(html.status(), path).toBe(200);
      expect(html.headers()['content-type'], path).toContain('text/html');
      expect(await html.body(), path).toHaveLength(0);
    }
  });

  test('preserva normalización canónica y Link de descubrimiento', async ({ request }) => {
    const response = await request.get('/clinica/hems-una-heredia', {
      headers: { Accept: 'text/markdown' },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toMatch(/\/clinica\/hems-una-heredia\/$/);

    const markdown = await request.get('/');
    expect(markdown.headers()['content-type']).toContain('text/html');
    const negotiated = await request.get('/', { headers: { Accept: 'text/markdown' } });
    expect(negotiated.headers()['link'] ?? '').toContain('rel="api-catalog"');
    expect(negotiated.headers()['link'] ?? '').toContain('rel="service-desc"');
    expect(negotiated.headers()['link'] ?? '').toContain('rel="service-doc"');
    expect(negotiated.headers()['link'] ?? '').toContain('rel="describedby"');
  });
});

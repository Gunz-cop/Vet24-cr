import { test, expect } from '../../playwright.config';

test('el bundle niega acceso administrativo directo en host local sin redirigir', async ({ request }) => {
  for (const path of ['/admin', '/admin/', '/admin/index.html', '/admin/nueva/', '/admin/editar/hems-una-heredia/', '/admin/assets/accidental.html', '/api/admin', '/api/admin/clinics/']) {
    // Astro preview handles OPTIONS before the application middleware. The
    // complete OPTIONS matrix is covered by tests/integration/admin-worker.test.mjs.
    for (const method of ['GET', 'HEAD', 'POST']) {
      const response = await request.fetch(path, { method, maxRedirects: 0 });
      expect(response.status(), `${method} ${path}`).toBe(403);
      expect(response.headers()['cache-control']).toBe('private, no-store');
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
      expect(response.headers().location).toBeUndefined();
      if (method === 'HEAD') expect(await response.body()).toHaveLength(0);
      if (method === 'POST') expect(response.headers()['content-type']).toContain('application/json');
    }
  }
});

test('compatibilidad y tombstones cumplen métodos sobre el Worker compilado', async ({ request }) => {
  for (const suffix of ['', '/']) {
    // Astro preview handles OPTIONS before the application middleware. The
    // complete OPTIONS matrix is covered by tests/integration/admin-worker.test.mjs.
    for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      for (const authorization of ['', 'Bearer legacy-rejected']) {
        const response = await request.fetch(`/api/status-override${suffix}`, { method, headers: { authorization }, maxRedirects: 0 });
        expect(response.status(), `${method} status-override${suffix}`).toBe(['GET', 'HEAD'].includes(method) ? 503 : 405);
        expect(response.headers().location).toBeUndefined();
        if (method === 'HEAD') expect(await response.body()).toHaveLength(0);
        else if (method === 'GET') expect((await response.json()).error).toBe('LIVE_NOT_READY');
        else expect(response.headers().allow).toBe('GET, HEAD');
        for (const name of ['analytics', 'cron-check-links']) {
          const tombstone = await request.fetch(`/api/${name}${suffix}`, { method, headers: { authorization }, maxRedirects: 0 });
          expect(tombstone.status(), `${method} ${name}${suffix}`).toBe(410);
          expect(tombstone.headers().location).toBeUndefined();
          if (method === 'HEAD') expect(await tombstone.body()).toHaveLength(0);
        }
      }
    }
  }
});

test('el sitemap compilado no contiene administración', async ({ request }) => {
  const sitemap = await request.get('/sitemap-0.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).not.toMatch(/<loc>[^<]*\/admin(?:\/|<)/i);
});

test('buscar y filtrar siguen operativos sin solicitudes a analytics', async ({ page }) => {
  const telemetry: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.replace(/\/$/, '') === '/api/analytics') telemetry.push(request.url());
  });
  await page.goto('/');
  const cards = page.locator('#clinicas-grid article:not(.hidden)');
  await expect.poll(() => cards.count()).toBeGreaterThan(1);
  const total = await cards.count();
  await page.fill('#search-input', 'Agromedica');
  await expect.poll(() => cards.count()).toBeLessThan(total);
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  for (const card of await cards.all()) await expect(card.locator('h3')).toContainText(/Agromédica|Agromedica/i);
  await page.click('#btn-clear-search');
  await expect.poll(() => cards.count()).toBe(total);
  await page.click('#filter-hotel');
  await expect(page.locator('#filter-hotel')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => cards.count()).toBeLessThan(total);
  await expect.poll(() => cards.count()).toBeGreaterThan(0);
  await page.click('#reset-all-filters');
  await expect.poll(() => cards.count()).toBe(total);
  expect(telemetry).toEqual([]);
});

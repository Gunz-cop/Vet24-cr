import { test, expect } from '../../playwright.config';

const articles = [
  '/blog/guias-por-especie/urgencias-en-perros/',
  '/blog/guias-por-especie/urgencias-en-gatos/',
  '/blog/guias-por-especie/atencion-veterinaria-para-exoticos/',
  '/blog/costos-y-acceso/costo-emergencia-veterinaria-nocturna/',
  '/blog/costos-y-acceso/atencion-veterinaria-24h-por-zona/',
];

test.describe('blog B4', () => {
  for (const path of ['/blog/', '/blog/guias-por-especie/', '/blog/costos-y-acceso/']) {
    test(`${path} existe y tiene canonical con barra final`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://vet24cr.com${path}`);
      await expect(page.locator('body')).not.toContainText('en preparación editorial');
    });
  }

  test('los cinco artículos están publicados, enlazados y tienen Article válido', async ({ page, request }) => {
    for (const path of articles) {
      expect((await request.get(path)).status(), path).toBe(200);
      await page.goto(path);
      await expect(page.locator('[data-blog-author]')).toHaveText('Equipo de Vet24cr');
      await expect(page.locator('time[data-date-published]')).toHaveAttribute('datetime', '2026-09-08');
      await expect(page.locator('body')).toContainText(/no sustituye|no diagnostica/i);
      const schema = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.map(n => JSON.parse(n.textContent ?? '{}')).find(v => v['@type'] === 'Article'));
      expect(schema.author).toEqual({ '@type': 'Organization', name: 'Equipo de Vet24cr' });
      expect(schema.url).toBe(`https://vet24cr.com${path}`);
    }
    await page.goto('/blog/');
    for (const path of articles) await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
  });

  test('sin scroll horizontal y foco visible en ambos viewports', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto('/blog/');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toBeVisible();
      expect(await focused.evaluate((el) => getComputedStyle(el).outlineStyle !== 'none')).toBe(true);
    }
  });

  test('evidencia visual de los cinco artículos en móvil y escritorio', async ({ page }, testInfo) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const path of articles) {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${path} ${viewport.width}`).toBe(true);
        const slug = path.split('/').filter(Boolean).at(-1);
        const screenshot = testInfo.outputPath(`${slug}-${viewport.width}.png`);
        await page.screenshot({ path: screenshot, fullPage: true });
        await testInfo.attach(`${slug}-${viewport.width}`, { path: screenshot, contentType: 'image/png' });
        if (process.env.B4_EVIDENCE_DIR) await page.screenshot({ path: `${process.env.B4_EVIDENCE_DIR}/${slug}-${viewport.width}.png`, fullPage: true });
      }
    }
  });
});

test('B3: política editorial publicada y enlazada desde el footer', async ({ page }) => {
  await page.goto('/politica-editorial/');
  await expect(page.locator('h1')).toHaveText('Política editorial');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://vet24cr.com/politica-editorial/');
  await expect(page.locator('footer a[href="/politica-editorial/"]')).toHaveCount(1);
  await expect(page.locator('body')).toContainText('redacción asistida por herramientas de inteligencia artificial');
  await expect(page.locator('body')).toContainText('no es una revisión veterinaria profesional');
  await expect(page.locator('body')).not.toContainText('comité de revisión');
});

test('B4: header y footer enlazan /blog/ con artículos publicados', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const path of ['/', '/blog/', '/blog/guias-por-especie/', '/politica-editorial/']) {
        await page.goto(path);
        const headerLink = page.locator('#nav-blog');
        const footerLink = page.locator('footer a[href="/blog/"]');
        await expect(headerLink).toHaveCount(1);
        await expect(headerLink).toHaveAttribute('href', '/blog/');
        await expect(footerLink).toHaveCount(1);
        await expect(footerLink).toHaveAttribute('href', '/blog/');
        await footerLink.focus();
        await expect(footerLink).toBeFocused();
      }
    }
});

test('B4: catálogo activo genera enlaces inversos en fichas y zonas', async ({ page }) => {
  for (const path of ['/clinica/hems-una-heredia/', '/clinica/hospital-vet-medical-care-heredia/', '/clinica/veterinaria-gocha-santo-domingo/', '/zona/san-pablo-heredia/', '/zona/guapiles/']) {
    await page.goto(path);
    await expect(page.locator('[data-blog-links]')).toHaveCount(1);
    await expect(page.locator('[data-blog-links] a').first()).toBeVisible();
  }
});

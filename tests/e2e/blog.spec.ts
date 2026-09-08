import { test, expect } from '../../playwright.config';

const pilotPath = '/blog/guias-por-especie/urgencias-en-perros/';

test.describe('blog B1', () => {
  for (const path of ['/blog/', '/blog/guias-por-especie/', '/blog/costos-y-acceso/']) {
    test(`${path} existe y tiene canonical con barra final`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://vet24cr.com${path}`);
      await expect(page.locator('body')).not.toContainText('Urgencias en perros: cómo reconocerlas');
    });
  }

  test('el piloto borrador da 404 y no está enlazado', async ({ page, request }) => {
    expect((await request.get(pilotPath)).status()).toBe(404);
    await page.goto('/blog/');
    await expect(page.locator(`a[href="${pilotPath}"]`)).toHaveCount(0);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
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

if (process.env.B3_PUBLISHED_FIXTURE !== '1') {
  test('B3: ninguna navegación muestra Blog sin artículos publicados', async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      for (const path of ['/', '/blog/', '/blog/guias-por-especie/', '/blog/costos-y-acceso/', '/politica-editorial/']) {
        await page.goto(path);
        await expect(page.locator('#nav-blog')).toHaveCount(0);
        await expect(page.locator('footer a[href="/blog/"]')).toHaveCount(0);
      }
    }
  });
} else {
  test('B3 fixture publicada: header y footer enlazan /blog/ también a 390px', async ({ page }) => {
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
    await page.goto(pilotPath);
    await expect(page.locator('[data-blog-author]')).toHaveText('Equipo de Vet24cr');
    const article = await page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent ?? '{}')).find((value) => value['@type'] === 'Article'),
    );
    expect(article.author).toEqual({ '@type': 'Organization', name: 'Equipo de Vet24cr' });
  });
}

test('B2: catálogo inactivo en fichas y zonas mientras el piloto es borrador', async ({ page }) => {
  for (const path of ['/clinica/hems-una-heredia/', '/clinica/hospital-vet-medical-care-heredia/', '/clinica/veterinaria-gocha-santo-domingo/', '/zona/san-pablo-heredia/', '/zona/guapiles/']) {
    await page.goto(path);
    await expect(page.locator('[data-blog-links]')).toHaveCount(0);
    await expect(page.locator(`a[href="${pilotPath}"]`)).toHaveCount(0);
  }
});

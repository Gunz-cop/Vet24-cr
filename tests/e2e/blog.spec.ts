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

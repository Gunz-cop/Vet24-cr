import { test, expect } from '../../playwright.config';

test.describe('Tier 4: Real-World Application Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('56. should execute scenario: user at Heredia with late-night surgery emergency', async ({ page, context }) => {
    // 1. Mock location to Heredia Centro
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
    await context.setGeolocation({ latitude: 9.9981, longitude: -84.1197 });

    // 2. Click ordenar por cercanía
    await page.click('#btn-use-location');

    // 3. Click "Solo 24/7" filter
    await page.click('#filter-quick-247');

    // 4. Search for "Heredia"
    await page.fill('#search-input', 'Heredia');

    // 5. Verify that the closest 24/7 clinic is visible
    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    await expect(visibleCards.first()).toBeVisible();
    await expect(visibleCards.first()).toContainText(/Ramírez/i);

    // 6. Go to details page
    await visibleCards.first().locator('a[id^="clinica-link-"]').click();

    // 7. Verify details page has title and call button
    await expect(page.locator('#clinica-name')).toContainText(/Ramírez/i);
    await expect(page.locator('#btn-quick-call')).toBeVisible();
  });

  test('57. should execute scenario: user looking for exotic pet care in San José', async ({ page, context }) => {
    // 1. Mock position to San José center
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
    await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });
    await page.click('#btn-use-location');

    // 2. Select "Exóticos" species filter
    await page.click('[data-filter-animal="exoticos"]');

    // 3. Search for "San José"
    await page.fill('#search-input', 'San José');

    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    await expect(visibleCards.first()).toBeVisible();

    const firstCardName = await visibleCards.first().locator('a[id^="clinica-link-"]').textContent();
    expect(firstCardName?.length).toBeGreaterThan(0);

    // 4. Go to clinic details page
    await visibleCards.first().locator('a[id^="clinica-link-"]').click();

    // 5. Verify detail page is loaded
    await expect(page.locator('#clinica-name')).toContainText(firstCardName!.trim());
  });

  test.fixme('58. should execute scenario: user reporting incorrect schedule data on details page', async ({ page }) => {
    // 1. Go to clinic details page
    await page.goto('/clinica/hems-una-heredia');

    // 2. Click report button
    await page.click('#btn-open-report');

    // 3. Fill out the report form
    await page.selectOption('#report-reason', { label: 'Horario incorrecto' });
    await page.fill('#report-description', 'Cierra a las 8pm los dosmingos');
    await page.fill('#report-contact', '8888-8888');

    // 4. Submit and check confirmation success msg
    await page.click('#btn-submit-report');
    await expect(page.locator('#report-success-msg')).toBeVisible();
  });

  test('59. should execute scenario: user recovers directory search after refusing geolocation', async ({ page, context }) => {
    // 1. Clear permissions so geolocation fails
    await context.clearPermissions();

    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toContain('No pudimos acceder a tu ubicación');
      await dialog.dismiss();
    });

    // 2. Click geolocation (will fail and trigger alert)
    await page.click('#btn-use-location');

    // 3. Search for "Escazú"
    await page.fill('#search-input', 'Escazú');

    // 4. Click "Abierto ahora" filter
    await page.click('#filter-quick-open');

    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    await expect(visibleCards.first()).toBeVisible();

    const firstCardName = await visibleCards.first().locator('a[id^="clinica-link-"]').textContent();

    // 5. Select clinic and view details page
    await visibleCards.first().locator('a[id^="clinica-link-"]').click();
    await expect(page.locator('#clinica-name')).toContainText(firstCardName!.trim());

    // 6. Go back to directory
    await page.click('#btn-back');
    await expect(page.locator('#search-input')).toBeVisible();
  });

  test('60. should execute scenario: user navigates through complex dashboard filter combination and resets', async ({ page }) => {
    // 1. Toggle map view on homepage
    await page.click('#toggle-mapa-btn');
    await expect(page.locator('#mapa-wrapper')).toBeHidden();

    // 2. Select province filter (navigates to San José page)
    await page.click('#filter-prov-san-jose');
    await expect(page.locator('#provincia-title')).toContainText('San José');

    // 3. Select animal type filter (Domésticos)
    await page.click('[data-filter-animal="domesticos"]');

    // 4. Search for a clinic
    await page.fill('#search-input', 'La Vete');

    // 5. Reset filters locally
    await page.click('#reset-all-filters');
    await expect(page.locator('#search-input')).toHaveValue('');

    // 6. Go back to home page and verify full catalog is restored
    await page.click('#btn-back-home');
    await expect(page.locator('#clinicas-grid article').first()).toBeVisible();
    
    const cards = page.locator('#clinicas-grid article');
    expect(await cards.count()).toBeGreaterThan(10);
  });
});

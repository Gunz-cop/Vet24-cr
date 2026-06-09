import { test, expect } from '../../playwright.config';

test.describe('Vet24 CR - Smoke Test Suite', () => {
  test('should load the homepage and display the main sections and elements', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Assert that the page title contains expected site identity
    await expect(page).toHaveTitle(/Directorio de Veterinarias de Emergencia/);
    await expect(page).toHaveTitle(/Vet24 Costa Rica/);

    // Assert that navigation logo is present and visible
    const navLogo = page.locator('#nav-logo');
    await expect(navLogo).toBeVisible();
    await expect(navLogo).toContainText('Vet24');

    // Assert that the hero section title is visible and contains expected content
    const heroTitle = page.locator('#hero-title');
    await expect(heroTitle).toBeVisible();
    await expect(heroTitle).toContainText('Emergencias 24/7');

    // Assert that directory quick filters or listings container is present
    const directorySection = page.locator('#directorio');
    await expect(directorySection).toBeVisible();

    const directoryTitle = page.locator('#directorio-title');
    await expect(directoryTitle).toHaveText('Clínicas Veterinarias Registradas');
  });
});

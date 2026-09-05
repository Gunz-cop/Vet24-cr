import { test, expect } from '../../playwright.config';

// Helper for Haversine distance
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

test.describe('Tier 1: Feature Coverage', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test.describe('Geolocation Proximity Sorting', () => {
    test('1. should request geolocation permission when clicking ordenar por cercanía button', async ({ page }) => {
      // Spy on navigator.geolocation.getCurrentPosition
      await page.addInitScript(() => {
        (window as any).__geolocationCalled = false;
        const original = navigator.geolocation.getCurrentPosition;
        navigator.geolocation.getCurrentPosition = function(success, error, options) {
          (window as any).__geolocationCalled = true;
          // Trigger the success callback immediately to simulate granted permission
          success({
            coords: {
              latitude: 9.9281,
              longitude: -84.0907,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON() { return { ...this }; },
            },
            timestamp: Date.now(),
            toJSON() { return { coords: this.coords.toJSON(), timestamp: this.timestamp }; },
          });
        };
      });

      await page.goto('/');
      await page.click('#btn-use-location');
      
      const called = await page.evaluate(() => (window as any).__geolocationCalled);
      expect(called).toBe(true);
    });
    test('2. should sort clinics by proximity with user location set to San José coordinates', async ({ page, context }) => {
      // Grant geolocation permission and mock position to San José
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      // Click sorting button if not already active
      const btnText = await page.locator('#geo-btn-text').textContent();
      if (!btnText?.includes('Ordenado')) {
        await page.click('#btn-use-location');
      }

      // Wait for distances to be updated
      await expect(page.locator('[data-distance-for]').first()).toBeVisible();
      // Retrieve all active clinic cards (non-hidden) with valid coordinates
      const cards = page.locator('#clinicas-grid article:not(.hidden)');
      const count = await cards.count();
      const distances: number[] = [];

      for (let i = 0; i < count; i++) {
        const latAttr = await cards.nth(i).getAttribute('data-latitude');
        const lngAttr = await cards.nth(i).getAttribute('data-longitude');
        const lat = parseFloat(latAttr || '0');
        const lng = parseFloat(lngAttr || '0');
        if (lat !== 0 && lng !== 0) {
          distances.push(haversine(9.9281, -84.0907, lat, lng));
        }
      }

      // Verify that distances are sorted in ascending order (closest first)
      for (let i = 0; i < distances.length - 1; i++) {
        expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
      }
    });

    test('3. should calculate distances in kilometers and display them on distance badges', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      const btnText = await page.locator('#geo-btn-text').textContent();
      if (!btnText?.includes('Ordenado')) {
        await page.click('#btn-use-location');
      }

      const firstBadge = page.locator('[data-distance-for]').first();
      await expect(firstBadge).toBeVisible();
      const badgeText = await firstBadge.textContent();
      expect(badgeText).toContain('km');
    });

    test('4. should format distance badge text as A X.X km', async ({ page, context }) => {
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      const btnText = await page.locator('#geo-btn-text').textContent();
      if (!btnText?.includes('Ordenado')) {
        await page.click('#btn-use-location');
      }

      const firstBadge = page.locator('[data-distance-for]').first();
      await expect(firstBadge).toBeVisible();
      await expect(firstBadge).toHaveText(/A \d+(\.\d+)? km/);
    });

    test('5. should updated sorting order when user coordinates change', async ({ page, context }) => {
      // Set to Liberia coordinates
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 10.6350, longitude: -85.4377 });

      // Wait for auto-geolocation to kick in; only click if it did not
      const geoText = page.locator('#geo-btn-text');
      try {
        await expect(geoText).toHaveText(/Ordenado/, { timeout: 3000 });
      } catch {
        await page.click('#btn-use-location');
        await expect(geoText).toHaveText(/Ordenado/, { timeout: 10000 });
      }

      // Wait for distances to be updated
      await expect(page.locator('[data-distance-for]').first()).toBeVisible();

      // First clinic in sorted list should be the one closest to Liberia
      const firstCard = page.locator('#clinicas-grid article:not(.hidden)').first();
      await expect(firstCard).toHaveAttribute('data-slug', 'guanavet-liberia');
    });
  });

  test.describe('Interactive Map', () => {
    test('6. should render the Leaflet map container on the main page', async ({ page }) => {
      await expect(page.locator('#map-container')).toBeVisible();
    });

    test('7. should render user current location pin on the map after geolocating', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      await page.click('#btn-use-location');

      const userPin = page.locator('.user-location-pin');
      await expect(userPin).toBeVisible({ timeout: 15000 });
    });

    test('8. should display pins representing the clinics on the map', async ({ page }) => {
      // Wait for Leaflet map loading overlay to disappear
      await expect(page.locator('#mapa-loading')).toBeHidden({ timeout: 15000 });

      // Count clinic pins/markers on the map
      const markerCount = await page.locator('.leaflet-marker-icon').count();
      expect(markerCount).toBeGreaterThan(0);
    });

    test('9. should open popup when clicking a clinic pin on the map', async ({ page }) => {
      await expect(page.locator('#mapa-loading')).toBeHidden({ timeout: 15000 });

      // Click the first clinic pin
      await page.locator('.leaflet-marker-icon').first().click({ force: true });

      // Check popup visibility
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();
    });

    test('10. should display correct details and action buttons (CTAs) in map popup', async ({ page }) => {
      await expect(page.locator('#mapa-loading')).toBeHidden({ timeout: 15000 });

      // Click the first clinic pin
      await page.locator('.leaflet-marker-icon').first().click({ force: true });

      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();

      // Assert popup details and CTAs
      const title = popup.locator('strong');
      await expect(title).toBeVisible();
      
      const callBtn = popup.locator('.btn-popup-call');
      await expect(callBtn).toBeVisible();
      
      const navBtn = popup.locator('.btn-popup-nav');
      await expect(navBtn).toBeVisible();
    });
  });

  test.describe('Predictive Text Search', () => {
    test('11. should filter clinics grid by name', async ({ page }) => {
      await page.fill('#search-input', 'Agromedica');
      
      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const name = await visibleCards.nth(i).getAttribute('data-nombre');
        expect(name?.toLowerCase()).toContain('agromedica');
      }
    });

    test('12. should filter clinics grid by canton', async ({ page }) => {
      await page.fill('#search-input', 'La Unión');

      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);

      // Sanity check matching La Unión
      for (let i = 0; i < count; i++) {
        const text = await visibleCards.nth(i).innerText();
        expect(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).toContain('la union');
      }
    });

    test('13. should filter clinics grid by zone', async ({ page }) => {
      await page.fill('#search-input', 'San Pablo');

      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const zone = await visibleCards.nth(i).getAttribute('data-zona-text');
        expect(zone?.toLowerCase()).toContain('san pablo');
      }
    });

    test('14. should filter clinics grid by service/tag (e.g. exóticos)', async ({ page }) => {
      await page.fill('#search-input', 'exóticos');

      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      const count = await visibleCards.count();
      expect(count).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const isExotic = await visibleCards.nth(i).getAttribute('data-exoticos');
        expect(isExotic).toBe('true');
      }
    });

    test('15. should clear search and restore all clinics when clicking reset/clear search button', async ({ page }) => {
      await page.fill('#search-input', 'Agromedica');
      await expect(page.locator('#btn-clear-search')).toBeVisible();

      await page.click('#btn-clear-search');
      await expect(page.locator('#search-input')).toHaveValue('');
      await expect(page.locator('#btn-clear-search')).toBeHidden();

      const hiddenCards = page.locator('#clinicas-grid article.hidden');
      await expect(hiddenCards).toHaveCount(0);
    });
  });

  test.describe('Empty State Fallback', () => {
    test('16. should display empty state container when 0 matches found', async ({ page }) => {
      await page.fill('#search-input', 'xyzabc123nonexistent');
      await expect(page.locator('#empty-state')).toBeVisible();
    });

    test('17. should show visible empty state warning messages', async ({ page }) => {
      await page.fill('#search-input', 'xyzabc123nonexistent');
      await expect(page.locator('#empty-state')).toContainText('No encontramos veterinarias con estos filtros');
    });

    test('18. should list closest verified clinics in empty state fallback list when geolocation is active', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      await page.click('#btn-use-location');
      await page.fill('#search-input', 'xyzabc123nonexistent');

      await expect(page.locator('#empty-state-fallback-list')).toBeVisible();
      const fallbackItems = page.locator('#empty-state-fallback-list a');
      expect(await fallbackItems.count()).toBeGreaterThan(0);
    });

    test('19. should display empty state when filter combinations result in 0 matches', async ({ page }) => {
      // Filter for Solo 24/7 AND search something that has no 24/7 results or is non-existent
      await page.click('#filter-quick-247');
      await page.fill('#search-input', 'Guanavet'); // Guanavet is not 24/7 (emergencias24h is false)
      
      await expect(page.locator('#empty-state')).toBeVisible();
    });

    test('20. should restore clinics list when clearing search inputs or resetting filters', async ({ page }) => {
      await page.fill('#search-input', 'xyzabc123nonexistent');
      await expect(page.locator('#empty-state')).toBeVisible();

      await page.click('#reset-all-filters');
      await expect(page.locator('#empty-state')).toBeHidden();
      await expect(page.locator('#search-input')).toHaveValue('');

      const visibleCount = await page.locator('#clinicas-grid article:not(.hidden)').count();
      expect(visibleCount).toBeGreaterThan(0);
    });
  });

  test.describe('Report Incorrect Data form', () => {
    test.fixme('21. should show report incorrect data button on clinic detail page', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await expect(page.locator('#btn-open-report')).toBeVisible();
    });

    test.fixme('22. should open report incorrect data modal when clicking report button', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await expect(page.locator('#report-modal')).toBeVisible();
    });

    test.fixme('23. should show validation error when submitting empty description in form', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      
      // Submit form directly without filling description
      await page.click('#btn-submit-report');

      // Verify that validation error element is shown
      await expect(page.locator('#error-description')).toBeVisible();
    });

    test.fixme('24. should show success message after mock submitting report form with POST request intercepted', async ({ page }) => {
      await page.route('**/api/report-incorrect', async (route) => {
        expect(route.request().method()).toBe('POST');
        const payload = route.request().postDataJSON();
        expect(payload.reason).toBe('horario');
        expect(payload.description).toBe('El horario de los domingos es incorrecto.');
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      
      await page.selectOption('#report-reason', 'horario');
      await page.fill('#report-description', 'El horario de los domingos es incorrecto.');
      
      await page.click('#btn-submit-report');
      
      await expect(page.locator('#report-success-msg')).toBeVisible();
    });

    test.fixme('25. should hide report modal when clicking close button', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await expect(page.locator('#report-modal')).toBeVisible();

      await page.click('#btn-close-report-modal');
      await expect(page.locator('#report-modal')).toBeHidden();
    });
  });

  test.describe('SOS Emergency Button', () => {
    test('61. should activate SOS flow on homepage when clicking SOS button', async ({ page, context }) => {
      // Grant geolocation permission and mock position to San José
      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });
      await page.reload({ waitUntil: 'domcontentloaded' });

      // Click the SOS button in the hero
      await page.click('#cta-sos-hero');

      // The SOS emergency card should be visible
      const card = page.locator('#sos-emergency-card');
      await expect(card).toBeVisible({ timeout: 15000 });

      // The card should display the title / text indicating it's the closest open 24/7 clinic
      await expect(card).toContainText('Veterinaria de emergencias abierta más cercana');
    });

    test('61b. should prioritize the nearest open clinic over a farther 24/7 clinic in SOS flow', async ({ page, context }) => {
      await page.addInitScript(() => {
        const fixedTime = new Date('2026-06-22T01:08:00.000Z');
        const RealDate = Date;
        class MockDate extends RealDate {
          constructor(...args: [] | ConstructorParameters<typeof Date>) {
            if (args.length === 0) {
              super(fixedTime.getTime());
            } else {
              super(...args);
            }
          }
          static now() {
            return fixedTime.getTime();
          }
        }
        window.Date = MockDate as DateConstructor;
      });
      await page.reload({ waitUntil: 'domcontentloaded' });

      await context.grantPermissions(['geolocation']);
      await context.setGeolocation({ latitude: 9.89, longitude: -84.11 });

      await page.click('#btn-sos-emergency');

      const card = page.locator('#sos-emergency-card');
      await expect(card).toBeVisible({ timeout: 15000 });
      await expect(card).toContainText('Veterinaria abierta más cercana (horario regular)');
      await expect(card).toContainText('Veterinaria San Martín de Porres');
      await expect(card).not.toContainText('Hospital Veterinario Agromédica');
    });

    test('62. should redirect to homepage with sos=true parameter when clicking SOS button on details page', async ({ page }) => {
      // Navigate to a details page
      await page.goto('/clinica/hospital-vet-santamaria-alajuela/', { waitUntil: 'domcontentloaded' });

      // Click the SOS button
      await page.click('#btn-sos-emergency');

      // Should redirect to homepage with ?sos=true
      await page.waitForURL(url => url.searchParams.get('sos') === 'true', { timeout: 10000 });
      const url = page.url();
      expect(url).toContain('sos=true');
    });
  });
});

import { test, expect } from '../../playwright.config';

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

test.describe('Tier 3: Cross-Feature Combinations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('51. should filter by search text while proximity sorting is active and preserve sorted order', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
    await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

    await page.click('#btn-use-location');
    await page.fill('#search-input', 'Hospital');

    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    const count = await visibleCards.count();
    const distances: number[] = [];

    for (let i = 0; i < count; i++) {
      const lat = parseFloat(await visibleCards.nth(i).getAttribute('data-latitude') || '0');
      const lng = parseFloat(await visibleCards.nth(i).getAttribute('data-longitude') || '0');
      if (lat !== 0 && lng !== 0) {
        distances.push(haversine(9.9281, -84.0907, lat, lng));
      }
    }

    // Distances must be in ascending order
    for (let i = 0; i < distances.length - 1; i++) {
      expect(distances[i]).toBeLessThanOrEqual(distances[i + 1]);
    }
  });

  test('52. should dynamically hide map markers of clinics filtered out by search input', async ({ page }) => {
    await expect(page.locator('#mapa-loading')).toBeHidden();
    const initialMarkerCount = await page.locator('.leaflet-marker-icon').count();

    // Search for a specific clinic to filter out others
    await page.fill('#search-input', 'Agromedica');

    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    const expectedCount = await visibleCards.count();

    const filteredMarkerCount = await page.locator('.leaflet-marker-icon').count();
    expect(filteredMarkerCount).toBe(expectedCount);
    expect(filteredMarkerCount).toBeLessThan(initialMarkerCount);
  });

  test('53. should support combining open now status, 24/7 filter, species filter, and text search concurrently', async ({ page }) => {
    await page.click('#filter-quick-open');
    await page.click('#filter-quick-247');
    await page.click('[data-filter-animal="exoticos"]');
    await page.fill('#search-input', 'Vete');

    const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
    const count = await visibleCards.count();

    // Verify all active cards meet the filters
    for (let i = 0; i < count; i++) {
      const card = visibleCards.nth(i);
      await expect(card).toHaveAttribute('data-exoticos', 'true');
      await expect(card).toHaveAttribute('data-247', 'true');
      await expect(card).toHaveAttribute('data-is-open', 'true');
      
      const name = await card.getAttribute('data-nombre');
      expect(name?.toLowerCase()).toContain('vete');
    }
  });

  test('54. should show closest closed clinics in fallback grid when geolocation is active and search yields zero open clinics', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
    await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

    await page.click('#btn-use-location');

    // Force all clinics to be closed
    await page.evaluate(() => {
      document.querySelectorAll('#clinicas-grid article').forEach(card => {
        card.setAttribute('data-is-open', 'false');
      });
    });

    // Click "Open Now" filter (resulting in 0 open clinics)
    await page.click('#filter-quick-open');

    await expect(page.locator('#empty-state')).toBeVisible();
    await expect(page.locator('#fallback-cercanas')).toBeVisible();

    const fallbackCards = page.locator('#empty-state-fallback-list a');
    expect(await fallbackCards.count()).toBeGreaterThan(0);
  });

  test('55. should display user location pin on the map when geolocation is active', async ({ page, context }) => {
    await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
    await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

    await page.click('#btn-use-location');

    // Leaflet user location popup text should be visible
    await expect(page.locator('.leaflet-popup-content', { hasText: 'Tu ubicación' })).toBeVisible();
  });

  test('56. should adjust map center/bounds dynamically to fit visible markers when search filter is applied', async ({ page }) => {
    await expect(page.locator('#mapa-loading')).toBeHidden();

    // Get the initial center of the map
    const initialCenter = await page.evaluate(() => {
      const map = (window as any).__vet24Map;
      if (map) {
        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    });

    expect(initialCenter).not.toBeNull();

    // Filter by a clinic with distinct coordinates (e.g. Guanavet Liberia)
    await page.fill('#search-input', 'Guanavet');

    // Wait for the dynamic transition/animation
    await page.waitForTimeout(1000);

    // Get the updated center of the map
    const updatedCenter = await page.evaluate(() => {
      const map = (window as any).__vet24Map;
      if (map) {
        const center = map.getCenter();
        return { lat: center.lat, lng: center.lng };
      }
      return null;
    });

    expect(updatedCenter).not.toBeNull();

    // The center should have shifted significantly from San Jose
    expect(updatedCenter!.lat).not.toBeCloseTo(initialCenter!.lat, 2);
    expect(updatedCenter!.lng).not.toBeCloseTo(initialCenter!.lng, 2);

    // Guanavet is around latitude 10.6350, longitude -85.4377
    expect(updatedCenter!.lat).toBeCloseTo(10.6350, 1);
    expect(updatedCenter!.lng).toBeCloseTo(-85.4377, 1);
  });

  test('57. should render interactive map on province-specific pages containing only that province\'s clinics', async ({ page }) => {
    // Navigate to Cartago province page
    await page.goto('/provincia/cartago/');

    // Map container should be visible
    await expect(page.locator('#map-container')).toBeVisible();

    // Map loading overlay should disappear
    await expect(page.locator('#mapa-loading')).toBeHidden({ timeout: 15000 });

    // Every geolocated clinic in this province must have a marker.
    const clinicCount = await page.locator('#clinicas-grid article').evaluateAll(cards =>
      cards.filter(card => Number((card as HTMLElement).dataset.latitude) && Number((card as HTMLElement).dataset.longitude)).length
    );
    const markerCount = await page.locator('.leaflet-marker-icon').count();
    expect(clinicCount).toBeGreaterThan(0);
    expect(markerCount).toBe(clinicCount);

    // Get the map center
    const center = await page.evaluate(() => {
      const map = (window as any).__vet24Map;
      if (map) {
        const c = map.getCenter();
        return { lat: c.lat, lng: c.lng };
      }
      return null;
    });

    expect(center).not.toBeNull();
    // Cartago is around lat 9.86-9.9, lng -83.96
    expect(center!.lat).toBeCloseTo(9.9, 1);
    expect(center!.lng).toBeCloseTo(-83.96, 1);
  });
});

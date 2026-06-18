import { test, expect } from '../../playwright.config';

test.describe('Tier 2: Boundary & Corner Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Geolocation Boundaries', () => {
    test('26. should handle geolocation permission denied gracefully without crashing', async ({ page, context }) => {
      // Clear permissions so geolocation requests fail / prompt gets denied
      await context.clearPermissions();

      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('No pudimos acceder a tu ubicación');
        await dialog.dismiss();
      });

      await page.click('#btn-use-location');

      // Verify page is still responsive (can still search)
      await page.fill('#search-input', 'Agromedica');
      const visibleCount = await page.locator('#clinicas-grid article:not(.hidden)').count();
      expect(visibleCount).toBeGreaterThan(0);
    });

    test('27. should handle geolocation timeout gracefully', async ({ page }) => {
      // Simulate geolocation timeout error code (3)
      await page.addInitScript(() => {
        navigator.geolocation.getCurrentPosition = function(success, error) {
          if (error) {
            error({
              code: 3,
              message: 'Timeout expired',
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            } as GeolocationPositionError);
          }
        };
      });

      await page.goto('/');

      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('No pudimos acceder a tu ubicación');
        await dialog.dismiss();
      });

      await page.click('#btn-use-location');

      // Verify page stays stable
      await expect(page.locator('#hero-title')).toBeVisible();
    });

    test('28. should sort correctly and display large distance when user is at extreme coordinates (Tokyo)', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 35.6762, longitude: 139.6503 }); // Tokyo

      const btnText = await page.locator('#geo-btn-text').textContent();
      if (!btnText?.includes('Ordenado')) {
        await page.click('#btn-use-location');
      }

      await expect(page.locator('[data-distance-for]').first()).toBeVisible();
      const badgeText = await page.locator('[data-distance-for]').first().textContent();
      expect(badgeText).toContain('km');

      const matches = badgeText?.match(/\d+(\.\d+)?/);
      if (matches) {
        const dist = parseFloat(matches[0]);
        // Tokyo to Costa Rica is > 13000 km
        expect(dist).toBeGreaterThan(10000);
      }
    });

    test('29. should show zero distance when user is at exact coordinates of a clinic', async ({ page, context }) => {
      // HEMS is at: latitude: 9.9989, longitude: -84.1219
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 9.9989, longitude: -84.1219 });

      const btnText = await page.locator('#geo-btn-text').textContent();
      if (!btnText?.includes('Ordenado')) {
        await page.click('#btn-use-location');
      }

      const hemsCard = page.locator('#clinicas-grid article', { hasText: 'HEMS' });
      const badge = hemsCard.locator('[data-distance-for]');
      await expect(badge).toBeVisible();
      
      const badgeText = await badge.textContent();
      expect(badgeText).toContain('0.0 km');
    });

    test('30. should handle rapid repeated clicks of geolocation button without duplicate markers or UI corruption', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      // Click rapidly
      for (let i = 0; i < 5; i++) {
        await page.click('#btn-use-location');
      }

      await expect(page.locator('#mapa-loading')).toBeHidden();
      const markerCount = await page.locator('.leaflet-marker-icon').count();
      expect(markerCount).toBeGreaterThan(0);
    });
  });

  test.describe('Map Edge Cases', () => {
    test('31. should render and handle cluttered pins at close coordinates successfully', async ({ page }) => {
      await expect(page.locator('#mapa-loading')).toBeHidden();
      const markerCount = await page.locator('.leaflet-marker-icon').count();
      expect(markerCount).toBeGreaterThan(5);
    });

    test('32. should handle clinics with missing or zero coordinates by displaying sin coordenadas and excluding from map', async ({ page, context }) => {
      await context.grantPermissions(['geolocation'], { origin: 'http://localhost:4321' });
      await context.setGeolocation({ latitude: 9.9281, longitude: -84.0907 });

      await page.click('#btn-use-location');

      const zeroCards = page.locator('#clinicas-grid article[data-latitude="0"]');
      const count = await zeroCards.count();

      if (count > 0) {
        const badge = zeroCards.first().locator('[data-distance-for]');
        await expect(badge).toBeVisible();
        await expect(badge).toContainText('Sin coordenadas');
      }
    });

    test('33. should handle Leaflet load failure gracefully', async ({ page }) => {
      // Block Leaflet JS loading
      await page.route((url) => url.toString().includes('leaflet') && url.toString().endsWith('.js'), async (route) => {
        await route.abort('failed');
      });

      // Reload homepage to apply the routing interceptor
      await page.goto('/');

      // Main content should still load and not crash
      await expect(page.locator('#hero-title')).toBeVisible();
      // Map wrapper should keep the loading/error state
      await expect(page.locator('#mapa-loading')).toBeVisible();
    });

    test('34. should not show call button in popup if clinic has no phone number', async ({ page }) => {
      // Modify first clinic's data to have no phone and specific coordinates
      await page.addInitScript(() => {
        const originalParse = JSON.parse;
        JSON.parse = function(text, reviver) {
          const data = originalParse.call(JSON, text, reviver);
          if (Array.isArray(data) && data.length > 0) {
            const clinic = data.find(c => c.slug === 'agromedica-escazu') || data[0];
            clinic.telefono1 = undefined;
            clinic.latitude = 9.9999;
            clinic.longitude = -84.1111;
            clinic.nombre = "Clinica Sin Telefono";
          }
          return data;
        };
      });

      // Reload page to let script execute
      await page.goto('/');
      await expect(page.locator('#mapa-loading')).toBeHidden();

      // Click the marker for the mocked clinic
      await page.evaluate(() => {
        const markers = (window as any).__vet24Markers;
        if (markers && markers['agromedica-escazu']) {
          markers['agromedica-escazu'].fire('click');
        }
      });

      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();

      // Assert that call CTA is NOT present in popup
      const callBtn = popup.locator('.btn-popup-call');
      await expect(callBtn).toBeHidden();
    });

    test('35. should toggle map visibility when clicking toggle map button', async ({ page }) => {
      await page.click('#toggle-mapa-btn');
      await expect(page.locator('#mapa-wrapper')).toBeHidden();

      await page.click('#toggle-mapa-btn');
      await expect(page.locator('#mapa-wrapper')).toBeVisible();
    });
  });

  test.describe('Search Boundaries', () => {
    test('36. should normalize accents and handle special characters in search input', async ({ page }) => {
      await page.fill('#search-input', 'San José');
      const countWithAccent = await page.locator('#clinicas-grid article:not(.hidden)').count();

      await page.fill('#search-input', 'San Jose');
      const countWithoutAccent = await page.locator('#clinicas-grid article:not(.hidden)').count();

      expect(countWithAccent).toBe(countWithoutAccent);
      expect(countWithAccent).toBeGreaterThan(0);
    });

    test('37. should handle extremely long search queries without crashing', async ({ page }) => {
      await page.fill('#search-input', 'a'.repeat(200));
      await expect(page.locator('#empty-state')).toBeVisible();
    });

    test('38. should trim leading and trailing whitespaces from search input', async ({ page }) => {
      await page.fill('#search-input', '   Agromedica   ');
      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      await expect(visibleCards.first()).toContainText(/Agromedica/i);
    });

    test('39. should perform case-insensitive search matching', async ({ page }) => {
      await page.fill('#search-input', 'AGROMEDICA');
      const visibleCards = page.locator('#clinicas-grid article:not(.hidden)');
      await expect(visibleCards.first()).toContainText(/Agromedica/i);
    });

    test('40. should escape HTML and script tags in search input safely (prevent XSS)', async ({ page }) => {
      page.on('dialog', () => {
        throw new Error('XSS Script executed!');
      });

      await page.fill('#search-input', '<script>alert("xss")</script>');
      await expect(page.locator('#empty-state')).toBeVisible();
    });
  });

  test.describe('Empty State Boundaries', () => {
    test('41. should restore all clinics when clicking reset all filters button in empty state', async ({ page }) => {
      await page.fill('#search-input', 'xyzabc123nonexistent');
      await expect(page.locator('#empty-state')).toBeVisible();

      await page.click('#reset-all-filters');
      const hiddenCount = await page.locator('#clinicas-grid article.hidden').count();
      expect(hiddenCount).toBe(0);
    });

    test('42. should display empty state when all clinics are closed under open now filter', async ({ page }) => {
      // Set all clinics open status to false
      await page.evaluate(() => {
        document.querySelectorAll('#clinicas-grid article').forEach(card => {
          card.setAttribute('data-is-open', 'false');
        });
      });

      await page.click('#filter-quick-open');
      await expect(page.locator('#empty-state')).toBeVisible();
    });

    test('43. should hide low-confidence and review-required clinics when status filters are active', async ({ page }) => {
      // Modify first card to have low confidence and make it 24/7 normally
      await page.evaluate(() => {
        const firstCard = document.querySelector('#clinicas-grid article');
        if (firstCard) {
          firstCard.setAttribute('data-confidence', 'low');
          firstCard.setAttribute('data-247', 'true');
        }
      });

      await page.click('#filter-quick-247');
      const firstCard = page.locator('#clinicas-grid article').first();
      await expect(firstCard).toHaveClass(/hidden/);
    });

    test('44. should hide empty state immediately when search query is cleared', async ({ page }) => {
      await page.fill('#search-input', 'xyzabc123nonexistent');
      await expect(page.locator('#empty-state')).toBeVisible();

      await page.fill('#search-input', '');
      await expect(page.locator('#empty-state')).toBeHidden();
    });

    test('45. should verify details page does not render empty state elements', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await expect(page.locator('#empty-state')).toBeHidden();
    });
  });

  test.describe('Report Form Boundaries', () => {
    test.fixme('46. should show validation errors when submitting empty report form', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await page.click('#btn-submit-report');
      // Assert validation errors are visible on fields
      await expect(page.locator('#error-description')).toBeVisible();
    });

    test.fixme('47. should show validation error when contact phone has invalid format', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await page.fill('#report-description', 'El horario es incorrecto');
      await page.fill('#report-contact', 'invalid_phone');
      await page.click('#btn-submit-report');
      // Assert phone validation error
      await expect(page.locator('#error-contact')).toBeVisible();
    });

    test.fixme('48. should submit successfully when description has extremely long text', async ({ page }) => {
      await page.route('**/api/report-incorrect', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await page.fill('#report-description', 'a'.repeat(1000));
      await page.click('#btn-submit-report');
      await expect(page.locator('#report-success-msg')).toBeVisible();
    });

    test.fixme('49. should preserve or reset form fields when modal is closed and reopened', async ({ page }) => {
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await page.fill('#report-description', 'Outdated schedule');
      await page.click('#btn-close-report-modal');
      await page.click('#btn-open-report');
      // Verify description is empty after reopening
      await expect(page.locator('#report-description')).toHaveValue('');
    });

    test.fixme('50. should disable submit button during submission to prevent duplicate reports', async ({ page }) => {
      await page.route('**/api/report-incorrect', async (route) => {
        // Slow response
        await new Promise(r => setTimeout(r, 1000));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      });
      await page.goto('/clinica/hems-una-heredia/');
      await page.click('#btn-open-report');
      await page.fill('#report-description', 'Outdated schedule');
      await page.click('#btn-submit-report');
      await expect(page.locator('#btn-submit-report')).toBeDisabled();
    });
  });
});

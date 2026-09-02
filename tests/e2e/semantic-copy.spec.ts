import { test, expect } from '../../playwright.config';

/**
 * Hotfix semántico: la UI no puede convertir un booleano `false` (que hoy mezcla
 * «desconocido», «no investigado» y «no ofrecido») en una afirmación negativa.
 * Ver src/lib/capabilityStatus.ts.
 */

// Afirmaciones que el dataset actual no puede sostener.
const AFIRMACIONES_PROHIBIDAS = [
  'Solo llamado',
  'No disponible / No confirmado',
  'No Disponible',
  'No Atiende',
  'Guardia Auditada',
  'Alta Confiabilidad',
  'Información auditada por llamada de prueba',
];

// Fichas representativas de cada combinación de estados.
const FICHA_INCIDENTE = '/clinica/hems-una-heredia/';                    // Tier B, casi todo false, VERIFIED sin evidencia
const FICHA_SIN_CAPACIDADES = '/clinica/atlantic-vet-guapiles/';          // Tier C, todos los booleanos en false
const FICHA_CONFIRMADA = '/clinica/la-vete-escazu/';                      // Tier A, todo confirmado + fecha y fuente
const FICHA_SIN_EVIDENCIA = '/clinica/agromedica-escazu/';                // Tier A confirmado, sin fecha ni fuente
const FICHA_EN_REVISION = '/clinica/aruma-centro-veterinario-upala/';     // Tier D, REVIEW_REQUIRED

test.describe('Hotfix semántico: false se presenta como "no confirmado"', () => {
  for (const url of [FICHA_INCIDENTE, FICHA_SIN_CAPACIDADES, FICHA_SIN_EVIDENCIA, FICHA_EN_REVISION, FICHA_CONFIRMADA]) {
    test(`ninguna afirmación no sustentada en ${url}`, async ({ page }) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const body = page.locator('body');
      for (const texto of AFIRMACIONES_PROHIBIDAS) {
        await expect(body).not.toContainText(texto);
      }
    });
  }

  test('overnight_doctor_present=false no produce "Solo llamado"', async ({ page }) => {
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-capability="overnight-doctor"]')).toHaveText('No confirmado');
  });

  test('has_hospitalization=false no produce "No disponible"', async ({ page }) => {
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-capability="hospitalization"]')).toHaveText('No confirmado');
  });

  test('emergencias24h=false usa el mismo copy neutral en toda la ficha', async ({ page }) => {
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    const bloques = page.locator('[data-capability="emergency-247"]');
    await expect(bloques).toHaveCount(2); // datos rápidos + servicios
    for (const texto of await bloques.allInnerTexts()) {
      expect(texto.trim()).toBe('No confirmado como 24/7');
    }
  });

  test('hotelMascotas=false se mantiene neutral', async ({ page }) => {
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    for (const texto of await page.locator('[data-capability="pet-hotel"]').allInnerTexts()) {
      expect(texto.trim()).toBe('No confirmado');
    }
  });

  test('los estados positivos confirmados siguen mostrándose', async ({ page }) => {
    await page.goto(FICHA_CONFIRMADA, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-capability="overnight-doctor"]')).toContainText('Confirmado Permanente');
    await expect(page.locator('[data-capability="hospitalization"]')).toContainText('Disponible');
    await expect(page.locator('[data-capability="emergency-247"]').first()).toContainText('Confirmada en esta ficha');
    await expect(page.locator('[data-capability="exotics"]')).toContainText('SÍ Atiende');
  });
});

test.describe('Hotfix semántico: badges de verificación', () => {
  test('record_status VERIFIED sin evidencia no afirma auditoría por llamada', async ({ page }) => {
    await page.goto(FICHA_SIN_EVIDENCIA, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-audit="record-status"]')).toHaveText('Ficha revisada');
    await expect(page.locator('[data-audit="review-evidence"]')).toHaveText('Revisión sin documentar');
    await expect(page.locator('[data-audit="last-review"]')).toContainText('Sin fecha de revisión registrada');
  });

  test('una fuente vacía no se rellena con "Llamada directa"', async ({ page }) => {
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-audit="last-review"]')).not.toContainText('Llamada directa');
  });

  test('con fecha y fuente reales se muestran tal cual', async ({ page }) => {
    await page.goto(FICHA_CONFIRMADA, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-audit="review-evidence"]')).toHaveText('Con fuente y fecha de revisión');
    await expect(page.locator('[data-audit="last-review"]')).toContainText('2026-06-08');
  });

  test('REVIEW_REQUIRED conserva la advertencia', async ({ page }) => {
    await page.goto(FICHA_EN_REVISION, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-audit="record-status"]')).toContainText('Pendiente de Auditoría');
  });
});

test.describe('Hotfix semántico: el Tier no cambia', () => {
  test('las etiquetas de Tier se mantienen', async ({ page }) => {
    await page.goto(FICHA_CONFIRMADA, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText('Tier A');
    await page.goto(FICHA_INCIDENTE, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText('Tier B');
  });
});

test.describe('Hotfix semántico: otras vistas', () => {
  test('la página de zona no etiqueta las fichas como "Verificadas"', async ({ page }) => {
    await page.goto('/zona/guapiles/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toContainText('Verificadas');
    await expect(page.locator('body')).toContainText('Revisadas');
  });

  test('las cards del directorio no afirman ausencia de servicios', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const grid = page.locator('#clinicas-grid');
    for (const texto of ['No Disponible', 'No Atiende', 'Solo llamado']) {
      await expect(grid).not.toContainText(texto);
    }
  });
});

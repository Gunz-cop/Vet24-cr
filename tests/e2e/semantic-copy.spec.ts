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

test.describe('Piloto semántico: Medical Care en HTML inicial', () => {
  test('expone horario, evidencia, alcance y límites sin JavaScript', async ({ request }) => {
    const response = await request.get('/clinica/hospital-vet-medical-care-heredia/');
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain('Horario reportado');
    expect(html).toContain('24/7 todos los días');
    expect(html).toContain('Verificado el <time datetime="2026-09-04">2026-09-04</time> mediante Confirmación directa del establecimiento por correo electrónico y llamada telefónica.');
    expect(html).toContain('la atención de emergencias veterinarias durante todo el día y la noche');
    expect(html).toContain('Presencia médica durante la noche</dt><dd class="mt-1 font-bold text-brand-text">Sí, confirmada en esta ficha');
    expect(html).toContain('Hospitalización</dt><dd class="mt-1 font-bold text-brand-text">Sí, confirmada en esta ficha');
    expect(html).toContain('Cirugía de emergencia</dt><dd class="mt-1 font-bold text-brand-text">Sí, confirmada en esta ficha');
    expect(html).toContain('no se infieren únicamente del 24/7');
    expect(html).toContain('no puede garantizar en tiempo real');
    expect(html).toContain('Contacta al establecimiento antes de trasladarte');
    expect(html).not.toContain('Verificando horario...');
  });

  test('mantiene coherencia entre JSON-LD y los datos visibles del piloto', async ({ request }) => {
    const html = await (await request.get('/clinica/hospital-vet-medical-care-heredia/')).text();
    const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)]
      .map((match) => JSON.parse(match[1]));
    const entity = jsonLd.find((value) => Array.isArray(value['@type']) && value['@type'].includes('VeterinaryCare'));
    const webPage = jsonLd.find((value) => value['@type'] === 'WebPage');

    expect(entity.name).toBe('Hospital Veterinario Medical Care');
    expect(entity.telephone).toBe('2262-6826');
    expect(entity.address.streetAddress).toContain('25 m oeste de la Escuela Moya Murillo');
    expect(entity.openingHoursSpecification).toHaveLength(7);
    expect(entity.contactPoint[0].contactType).toBe('WhatsApp');
    expect(entity.contactPoint[0].telephone).toBe('8639-6793');
    expect(entity).not.toHaveProperty('priceRange');
    expect(entity).not.toHaveProperty('image');
    expect(entity).not.toHaveProperty('geo');
    expect(entity).not.toHaveProperty('lastReviewed');
    expect(webPage.lastReviewed).toBe('2026-09-04');
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

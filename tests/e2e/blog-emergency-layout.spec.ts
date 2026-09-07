import { test, expect } from '../../playwright.config';
import { readFileSync, writeFileSync } from 'node:fs';

const paths = ['/clinica/hems-una-heredia/', '/clinica/hospital-vet-medical-care-heredia/', '/clinica/veterinaria-gocha-santo-domingo/', '/zona/san-pablo-heredia/', '/zona/guapiles/'];
const contacts = ['#btn-quick-call', '#btn-quick-wa', '#btn-call-sidebar-1', '#btn-call-sidebar-2', '#btn-wa-sidebar'];
const selectors = ['[aria-labelledby="seo-quick-facts-title"]', '#clinic-schedule-text', '#warning-diurnal-alert', ...contacts, '#clinicas-grid', '#search-input', '#filter-quick-open', '#filter-quick-247', '#btn-use-location', '#animal-filters-container', '#filter-hotel', '#results-count'];
for (const width of [390, 1440]) for (const path of paths) test(`B2 emergencia ${path} ${width}`, async ({ page }, testInfo) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  await page.clock.install({ time: new Date('2026-09-07T18:00:00Z') });
  await page.route('**/*', route => {
    const host = new URL(route.request().url()).hostname;
    return ['localhost', '127.0.0.1', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(host) ? route.continue() : route.abort();
  });
  await page.route('**/api/status-override?*', r => r.fulfill({ json: { success: true, override: null } }));
  await page.goto(path);
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load('600 16px Outfit'), document.fonts.load('400 16px "Plus Jakarta Sans"')]);
    await document.fonts.ready;
    scrollTo(0, 0);
  });
  const measurements = await page.evaluate(selectors => selectors.map(selector => {
    const e = document.querySelector(selector);
    if (!e) return { selector, present: false };
    const r = e.getBoundingClientRect();
    return { selector, present: true, text: e.textContent?.trim(), href: e.getAttribute('href'), rect: { x: r.x, y: r.y, width: r.width, height: r.height }, aboveFold: r.bottom > 0 && r.y < innerHeight, visible: !!e.getClientRects().length };
  }), selectors);
  if (process.env.B2_BASE_GEOMETRY) {
    const base = JSON.parse(readFileSync(process.env.B2_BASE_GEOMETRY, 'utf8')).find((r: { path: string; width: number }) => r.path === path && r.width === width);
    expect(base, 'referencia BASE obligatoria para esta ruta/viewport').toBeTruthy();
    for (const actual of measurements) {
      const previous = base.measurements.find((m: { selector: string }) => m.selector === actual.selector);
      expect(actual.present, actual.selector).toBe(previous.present);
      if (actual.present && actual.rect) {
        expect(actual.text, actual.selector).toBe(previous.text);
        expect(actual.href, actual.selector).toBe(previous.href);
        expect(actual.visible, actual.selector).toBe(previous.visible);
        if (previous.aboveFold) expect(actual.aboveFold, actual.selector).toBe(true);
        for (const axis of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(actual.rect[axis] - previous.rect[axis]), `${actual.selector}.${axis}`).toBeLessThanOrEqual(1);
      }
    }
  }
  const block = page.locator('[data-blog-links]');
  const active = process.env.B2_PUBLISHED_FIXTURE === '1';
  await expect(block).toHaveCount(active ? 1 : 0);
  if (active) {
    expect(await block.evaluate(el => {
      const previous = el.previousElementSibling;
      const complete = location.pathname.startsWith('/clinica/') ? previous?.contains(document.querySelector('#btn-call-sidebar-1')) : previous?.contains(document.querySelector('#clinicas-grid'));
      return !!complete && el.getBoundingClientRect().top >= previous!.getBoundingClientRect().bottom;
    })).toBe(true);
  }
  // Prevent native external navigation before keyboard activation; no call or message is sent.
  await page.evaluate(() => {
    (window as any).__b2Destinations = [];
    document.addEventListener('click', e => {
      const a = (e.target as Element).closest('a');
      if (a && /^(tel:|https:\/\/(wa.me|api.whatsapp.com))/.test(a.href)) {
        e.preventDefault();
        (window as any).__b2Destinations.push(a.getAttribute('href'));
      }
    }, true);
  });
  const keyboard = [];
  for (const selector of contacts) {
    const control = page.locator(selector);
    if (!await control.count()) { keyboard.push({ selector, present: false }); continue; }
    await control.focus();
    await expect(control).toBeFocused();
    const href = await control.getAttribute('href');
    expect(href).toMatch(/^(tel:|https:\/\/(wa.me|api.whatsapp.com))/);
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => (window as any).__b2Destinations.at(-1))).toBe(href);
    keyboard.push({ selector, present: true, href });
  }
  if (path.includes('hems-una')) {
    await expect(page.locator('#btn-quick-wa, #btn-wa-sidebar')).toHaveCount(0);
  }
  // Actual Tab traversal, retaining relative order of the existing contact controls.
  await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); document.body.tabIndex = -1; document.body.focus(); });
  const focusOrder: string[] = [];
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => document.activeElement?.id || '');
    if (contacts.includes('#' + id) && !focusOrder.includes(id)) focusOrder.push(id);
  }
  expect(focusOrder).toEqual(keyboard.filter(k => k.present).map(k => k.selector.slice(1)));
  if (path.startsWith('/zona/')) {
    const search = page.locator('#search-input');
    await search.fill('zzzz-b2-sin-resultados');
    await expect(page.locator('#results-count')).toContainText('0');
    await search.fill('');
    const filter = page.locator('#filter-quick-247');
    await filter.focus(); await page.keyboard.press('Enter');
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Enter');
    await expect(filter).toHaveAttribute('aria-pressed', 'false');
  }
  await page.evaluate(() => scrollTo(0, 0));
  const screenshot = testInfo.outputPath('emergency.png');
  await page.screenshot({ path: screenshot, fullPage: true });
  await testInfo.attach('emergency', { path: screenshot, contentType: 'image/png' });
  const record = { path, width, measurements, keyboard, focusOrder };
  await testInfo.attach('geometry-keyboard', { body: JSON.stringify(record, null, 2), contentType: 'application/json' });
  if (process.env.B2_EVIDENCE_DIR) {
    const name = `${path.split('/').filter(Boolean).join('-')}-${width}`;
    writeFileSync(`${process.env.B2_EVIDENCE_DIR}/${name}.json`, JSON.stringify(record, null, 2));
    await page.screenshot({ path: `${process.env.B2_EVIDENCE_DIR}/${name}.png`, fullPage: true });
  }
});

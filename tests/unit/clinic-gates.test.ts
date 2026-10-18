import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { scanResearchJson, scanText } from '../../scripts/clinics/check-no-google-content.ts';

const run = promisify(execFile);
const root = process.cwd();
const validate = join(root, 'scripts/clinics/validate-clinics.ts');
const googleGate = join(root, 'scripts/clinics/check-no-google-content.ts');

function clinicMarkdown(slug: string, overrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    id: 1, nombre: 'Clínica Ejemplo', provincia: 'San José', zona: 'Hatillo', direccion: 'Hatillo Centro',
    telefono1: '2254-1920', horarioTexto: 'L-V 8am-7pm', categoriaHorario: 'Horario normal', emergencias24h: false,
    atiendeExoticos: false, cirugiaEmergencia: false, slug, estado: 'publicado', copyDiferenciador: 'x',
    latitude: 9.917, longitude: -84.096,
    waze_url: 'https://waze.com/ul?q=Clinica%20Ejemplo%20Hatillo&navigate=yes',
    maps_url: 'https://www.google.com/maps/search/?api=1&query=Clinica%20Ejemplo%20Hatillo',
    ...overrides,
  };
  return `---\n${Object.entries(data).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}\n---\n\nCuerpo.\n`;
}

async function fixtureRepo(files: Record<string, string>) {
  const dir = await mkdtemp(join(tmpdir(), 'vet-clinics-'));
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true });
    await writeFile(join(dir, path), content);
  }
  return dir;
}

const runValidate = (cwd: string, ...args: string[]) => run(process.execPath, [validate, '--now', '2026-10-21', ...args], { cwd });

test('validate:clinics: sin base la deuda falla; con base pasa y una regresión vuelve a fallar', async () => {
  const dir = await fixtureRepo({ 'src/content/clinicas/legado.md': clinicMarkdown('legado'), 'src/content/clinicas/_borrador.md': 'ignorado' });
  try {
    await assert.rejects(runValidate(dir), (error: { stdout: string }) => /errores: 2 /.test(error.stdout) && /coord_precision/.test(error.stdout));
    const written = await runValidate(dir, '--write-baseline', '--baseline-commit', 'b2b490bd5105b80bcc6954897c9a688cd06f861c');
    assert.match(written.stdout, /2 entradas \(coord_precision 1, coord_source 1\)/);
    const passing = await runValidate(dir);
    assert.match(passing.stdout, /1 fichas · 0 sidecars/);
    assert.match(passing.stdout, /errores: 0 · deuda cubierta: 2 /);
    // Cambiar las coordenadas (aunque sea a otro valor de baja precisión) es una regresión.
    await writeFile(join(dir, 'src/content/clinicas/legado.md'), clinicMarkdown('legado', { latitude: 9.918 }));
    await assert.rejects(runValidate(dir), (error: { stdout: string }) => /errores: 2 /.test(error.stdout) && /DEUDA OBSOLETA/.test(error.stdout));
    // Corregirla de verdad deja la deuda obsoleta y --prune-baseline la retira.
    await writeFile(join(dir, 'src/content/clinicas/legado.md'), clinicMarkdown('legado', { latitude: 9.91751, longitude: -84.09623, location_source: 'operator_pin', location_verified_at: '2026-10-20' }));
    const pruned = await runValidate(dir, '--prune-baseline');
    assert.match(pruned.stdout, /retiradas 2 entradas/);
    const baseline = JSON.parse(await readFile(join(dir, 'docs/admin/data-debt.json'), 'utf8'));
    assert.deepEqual(baseline.entries, []);
    // Una ficha nueva con el mismo defecto no tiene exención.
    await writeFile(join(dir, 'src/content/clinicas/nueva.md'), clinicMarkdown('nueva', { record_status: 'VERIFIED' }));
    await assert.rejects(runValidate(dir), (error: { stdout: string }) => /nueva · derivation_mismatch/.test(error.stdout));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('validate:clinics: esquema, slug, evidencia inválida y huérfana', async () => {
  const evidence = await readFile(join(root, 'tests/fixtures/clinics/evidence-v2-verified.json'), 'utf8');
  const dir = await fixtureRepo({
    'src/content/clinicas/clinica-ejemplo.md': clinicMarkdown('clinica-ejemplo', { latitude: 9.91751, longitude: -84.09623, location_source: 'operator_pin', location_verified_at: '2026-10-20', record_status: 'VERIFIED', officially_confirmed: true }),
    'src/content/clinicas/mal-nombre.md': clinicMarkdown('otro-slug', { latitude: 9.91751, longitude: -84.09623, location_source: 'operator_pin', location_verified_at: '2026-10-20' }),
    'src/content/clinicas/rota.md': clinicMarkdown('rota', { estado: 'borrado' }),
    'research/clinics/clinica-ejemplo.json': evidence,
    'research/clinics/huerfana.json': evidence.replace('"clinica-ejemplo"', '"huerfana"'),
  });
  try {
    const result = await runValidate(dir, '--json').then(() => assert.fail('debía fallar'), (error: { stdout: string }) => JSON.parse(error.stdout));
    assert.equal(result.evidence, 2);
    const found = result.errors.map((issue: { slug: string; code: string }) => `${issue.slug}:${issue.code}`).sort();
    assert.deepEqual(found, ['huerfana:evidence_invalid', 'huerfana:evidence_orphan', 'mal-nombre:slug_filename', 'rota:schema_invalid']);
    assert.ok(!found.includes('clinica-ejemplo:derivation_mismatch'), 'la evidencia v2 respalda VERIFIED');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('check:no-google-content detecta payloads de Places/Brave y coordenadas de Google', () => {
  const cases: Array<[string, string]> = [
    ['{"regularOpeningHours": {"periods": []}}', 'google_places_payload'],
    ['"name": "places/ChIJ_EJEMPLO_SINTETICO_123"', 'google_places_resource'],
    ['https://places.googleapis.com/v1/places:searchText', 'google_api_host'],
    ['https://www.google.com/maps/place/X/@9.9175,-84.0962,17z/data=!3d9.9176!4d-84.0961', 'google_maps_coordinates'],
    ['waze_url: "https://www.waze.com/ul?ll=9.9175%2C-84.0962&navigate=yes"', 'nav_link_coordinates'],
    ['maps_url: "https://www.google.com/maps/search/?api=1&query=9.9175,-84.0962"', 'nav_link_coordinates'],
    ['{"extra_snippets": ["…"]}', 'brave_search_payload'],
  ];
  for (const [text, code] of cases) assert.ok(scanText('src/content/x.md', text, { research: false }).some((finding) => finding.code === code), code);
  // Lo que sí puede estar: búsqueda por texto, documentación de Google y place_id como dato.
  for (const text of [
    'maps_url: "https://www.google.com/maps/search/?api=1&query=Hospital%20Veterinario%20VEHASA"',
    'https://developers.google.com/maps/documentation/places/web-service/policies',
    'google_place_id: "ChIJ_EJEMPLO_SINTETICO_123"',
  ]) assert.deepEqual(scanText('src/content/x.md', text, { research: false }), [], text);
});

test('check:no-google-content: en research/ no hay correos ni teléfonos fuera de campos de teléfono', () => {
  const evidence = { facts: [{ field: 'telefono1', value: '2254-1920' }, { field: 'nombre', value: 'Llamar al 8993-3471' }], conflicts: [{ field: 'whatsapp', values: ['8993-3471'] }], sources: [{ note: 'Atendió al +506 8888 1234' }], observedAt: '2026-10-20T15:42:00Z', reviewBy: '2027-10-20' };
  assert.deepEqual(scanResearchJson('research/clinics/x.json', evidence).map((finding) => finding.excerpt), ['facts.1.value', 'sources.0.note']);
  assert.ok(scanText('research/clinics/x.json', JSON.stringify({ note: 'escribir a dueno@clinica.cr' }), { research: true }).some((finding) => finding.code === 'email_in_research'));
  assert.deepEqual(scanText('research/clinics/x.json', JSON.stringify({ url: 'https://www.instagram.com/@clinica.vet' }), { research: true }), []);
  assert.ok(scanText('research/notas.md', 'Tel. 2254 1920', { research: true }).some((finding) => finding.code === 'phone_outside_field'));
  assert.deepEqual(scanText('src/content/blog/x.md', 'Tel. 2254 1920', { research: false }), [], 'fuera de research/ los teléfonos son públicos');
});

test('check:no-google-content: CLI pasa en el repo y falla con un payload en research/', async () => {
  const ok = await run(process.execPath, [googleGate], { cwd: root });
  assert.match(ok.stdout, /check:no-google-content PASS/);
  const dir = await fixtureRepo({ 'research/clinics/x.json': '{"formattedAddress": "Calle 1"}\n' });
  try {
    await assert.rejects(run(process.execPath, [googleGate], { cwd: dir }), (error: { stderr: string }) => /research\/clinics\/x\.json:1 · google_places_payload/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('validate:clinics en el catálogo real: sin errores nuevos y VEHASA marcada para re-obtener coordenadas', async () => {
  const { stdout } = await runValidate(root, '--json');
  const report = JSON.parse(stdout);
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors.slice(0, 3)));
  assert.equal(report.stale.length, 0, 'la base no tiene deuda obsoleta');
  assert.ok(report.warnings.some((issue: { slug: string; code: string }) => issue.slug === 'vehasa-hatillo' && issue.code === 'coord_google_derived'));
  assert.ok(report.debt.some((issue: { slug: string; code: string }) => issue.slug === 'vehasa-hatillo' && issue.code === 'coord_source'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clinicSchema } from '../../src/lib/clinic-schema.ts';
import { parseEvidence } from '../../src/lib/clinic-evidence.ts';
import { applyDebtBaseline, buildDebtBaseline, coordinateDecimals, debtBaselineSchema, isCrPhone, navLinkProblems, serializeDebtBaseline, validateCatalog, validateClinicRecord, type Clinic, type DebtBaseline, type ValidationIssue } from '../../src/lib/clinic-validate.ts';
import { buildNavLinks } from '../../src/lib/clinic-lookup/nav-links.ts';

const now = new Date('2026-10-21T12:00:00-06:00');
/** Ficha nueva que cumple todas las reglas estrictas. */
function clinic(overrides: Record<string, unknown> = {}): Clinic {
  return clinicSchema.parse({
    id: 'd3b07384-d9a0-4c9b-8f6e-1a2b3c4d5e6f', nombre: 'Clínica Ejemplo', provincia: 'San José', zona: 'Hatillo', direccion: '100 m norte del parque',
    telefono1: '2254-1920', whatsapp: '8993-3471', horarioTexto: 'L-V 8am-7pm', categoriaHorario: 'Horario normal',
    emergencias24h: false, atiendeExoticos: false, cirugiaEmergencia: false, slug: 'clinica-ejemplo', estado: 'publicado', copyDiferenciador: 'x',
    latitude: 9.91751, longitude: -84.09623, location_source: 'operator_pin', location_verified_at: '2026-10-20',
    ...buildNavLinks({ nombre: 'Clínica Ejemplo', direccion: '100 m norte del parque, Hatillo' }),
    ...overrides,
  });
}
const codes = (issues: ValidationIssue[], severity?: 'error' | 'warning') => issues.filter((issue) => !severity || issue.severity === severity).map((issue) => issue.code).sort();
const check = (overrides: Record<string, unknown> = {}, extra = {}) => validateClinicRecord(clinic(overrides), { now, ...extra });

test('ficha nueva conforme: sin errores ni avisos', () => {
  assert.deepEqual(check(), []);
});

test('schema: campos nuevos opcionales; las fichas antiguas siguen compilando con legacy_unknown', () => {
  const legacy = clinicSchema.parse({ ...clinic(), location_source: undefined, location_verified_at: undefined });
  assert.equal(legacy.location_source, 'legacy_unknown');
  assert.equal(clinicSchema.safeParse({ ...clinic(), location_source: 'google' }).success, false, 'no existe fuente google');
  assert.equal(clinicSchema.safeParse({ ...clinic(), google_place_id: 'corto' }).success, false);
  assert.equal(clinicSchema.safeParse({ ...clinic(), google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123', google_place_id_checked_at: '2026-02-30' }).success, false);
});

test('precisión: decimales de la representación numérica, error con menos de 4 y aviso con 4', () => {
  assert.equal(coordinateDecimals(9.75), 2);
  assert.equal(coordinateDecimals(Number('9.7500')), 2, 'el YAML 9.7500 llega como 9.75');
  assert.equal(coordinateDecimals(-84.096189), 6);
  assert.equal(coordinateDecimals(1e-7), 7);
  const low = check({ latitude: 9.917, longitude: -84.09623 });
  assert.deepEqual(codes(low), ['coord_precision']);
  assert.equal(low[0].debtValue, '9.917,-84.09623', 'la deuda se ata al valor exacto');
  assert.deepEqual(codes(check({ latitude: 9.9175, longitude: -84.0962 })), ['coord_precision_4']);
  assert.deepEqual(codes(check({ latitude: 9.9175, longitude: -84.0962 }), 'error'), []);
});

test('rango de Costa Rica, 0,0 y excepción explícita de la Isla del Coco', () => {
  assert.deepEqual(codes(check({ latitude: 18.47693, longitude: -66.82534 })), ['coord_out_of_cr'], 'Hatillo, Puerto Rico');
  assert.deepEqual(codes(check({ latitude: 0, longitude: -84.09623 })), ['coord_zero']);
  assert.deepEqual(codes(check({ latitude: 0, longitude: 0 })), ['coord_missing']);
  assert.equal(check({ latitude: 0, longitude: 0 })[0].severity, 'error', 'publicada sin coordenadas');
  assert.equal(check({ latitude: 0, longitude: 0, estado: 'pendiente' })[0].severity, 'warning', 'borrador sin coordenadas');
  const coco = { latitude: 5.52833, longitude: -87.05722 };
  assert.deepEqual(codes(check(coco)), ['coord_out_of_cr'], 'sin nota');
  assert.deepEqual(codes(check({ ...coco, verification_notes: ['Puesto en la Isla del Coco (ACMC).'] })), []);
  assert.deepEqual(codes(check({ ...coco, verification_notes: ['Isla del Coco'], location_source: 'legacy_unknown', location_verified_at: undefined })), ['coord_out_of_cr', 'coord_source']);
});

test('location_source: legacy es deuda, almacenable exige fecha y Google no se blanquea', () => {
  const legacy = check({ location_source: 'legacy_unknown', location_verified_at: undefined });
  assert.deepEqual(codes(legacy), ['coord_source']);
  assert.equal(legacy[0].debtValue, '9.91751,-84.09623');
  assert.deepEqual(codes(check({ location_verified_at: undefined })), ['coord_source']);
  assert.equal(check({ location_verified_at: undefined })[0].debtValue, undefined, 'no es deuda heredable');
  assert.deepEqual(codes(check({ location_source: 'legacy_unknown' })), ['coord_source', 'coord_source']);
  assert.deepEqual(codes(check({ location_verified_at: '2026-10-22' })), ['date_in_future']);
  const tainted = [{ slug: 'clinica-ejemplo', value: '9.91751,-84.09623', commit: 'b2b490b', reason: 'Google Maps' }];
  assert.deepEqual(codes(check({}, { googleDerivedCoordinates: tainted })), ['coord_google_derived']);
  assert.equal(check({}, { googleDerivedCoordinates: tainted })[0].severity, 'error', 'cambiar solo la fuente no basta');
  const kept = check({ location_source: 'legacy_unknown', location_verified_at: undefined }, { googleDerivedCoordinates: tainted });
  assert.deepEqual(codes(kept, 'warning'), ['coord_google_derived']);
  assert.deepEqual(codes(check({ latitude: 9.91761 }, { googleDerivedCoordinates: tainted })), [], 'coordenadas re-obtenidas');
});

test('teléfonos de Costa Rica', () => {
  for (const ok of ['2254-1920', '4070-8383', '8993-3471', '800-123-4567']) assert.equal(isCrPhone(ok), true, ok);
  for (const bad of ['22541920', '+506 2254 1920', '1254-1920', '9254-1920', '800-VET-0000', '2254-192']) assert.equal(isCrPhone(bad), false, bad);
  assert.deepEqual(codes(check({ telefono1: '+506 2254 1920' })), ['phone_format']);
  assert.equal(check({ telefono2: '2254.1920' })[0].debtValue, '2254.1920');
  assert.deepEqual(codes(check({ whatsapp: '800-123-4567' })), ['phone_format']);
  assert.deepEqual(codes(check({ whatsapp: '4070-8383' })), ['whatsapp_not_mobile']);
});

test('enlaces de navegación: solo búsqueda por texto en hosts exactos', () => {
  const links = buildNavLinks({ nombre: 'Clínica Ejemplo', direccion: 'Hatillo' });
  assert.deepEqual(navLinkProblems('waze_url', links.waze_url), []);
  assert.deepEqual(navLinkProblems('maps_url', links.maps_url), []);
  // El formato que generaba nueva.astro antes de esta corrección.
  assert.match(navLinkProblems('waze_url', 'https://www.waze.com/ul?ll=9.9175%2C-84.0962&navigate=yes').join(), /waze\.com\/ul.*ll=.*falta el texto/);
  assert.match(navLinkProblems('maps_url', 'https://www.google.com/maps/search/?api=1&query=9.9175%2C-84.0962').join(), /son coordenadas/);
  assert.match(navLinkProblems('maps_url', 'https://www.google.com/maps/place/X/@9.9,-84.1,17z').join(), /host y la ruta/);
  assert.match(navLinkProblems('maps_url', `${links.maps_url}&query_place_id=ChIJ_EJEMPLO_SINTETICO_123`).join(), /D8/);
  assert.match(navLinkProblems('maps_url', 'https://www.google.com.evil.tld/maps/search/?api=1&query=x').join(), /host/);
  assert.match(navLinkProblems('waze_url', 'http://waze.com/ul?q=x').join(), /HTTPS/);
  assert.match(navLinkProblems('waze_url', 'https://user:pw@waze.com/ul?q=x').join(), /credenciales/);
  assert.match(navLinkProblems('waze_url', `https://waze.com/ul?q=${'a'.repeat(2048)}`).join(), /2 048/);
  assert.deepEqual(codes(check({ waze_url: 'https://www.waze.com/ul?ll=9.9175%2C-84.0962&navigate=yes' })), ['nav_link']);
  assert.deepEqual(codes(check({ maps_url: '' })), ['nav_link_missing']);
});

test('web y redes: URL HTTPS completa y host de la red correcta', () => {
  assert.deepEqual(codes(check({ web: 'https://clinica-ejemplo.cr', facebook: 'https://www.facebook.com/clinica', instagram: 'https://www.instagram.com/clinica' })), []);
  assert.deepEqual(codes(check({ facebook: 'facebook.com/clinica' })), ['link_format']);
  assert.deepEqual(codes(check({ instagram: '@clinica' })), ['link_format']);
  assert.deepEqual(codes(check({ instagram: 'https://www.facebook.com/clinica' })), ['link_format']);
});

test('place_id: formato, fechas, antigüedad y unicidad entre fichas', () => {
  assert.deepEqual(codes(check({ google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123', google_place_id_checked_at: '2026-10-01' })), []);
  assert.deepEqual(codes(check({ google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123' })), ['place_id_unchecked']);
  assert.deepEqual(codes(check({ google_place_id_checked_at: '2026-10-01' })), ['place_id_checked_orphan']);
  assert.deepEqual(codes(check({ google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123', google_place_id_checked_at: '2025-10-01' })), ['place_id_stale']);
  const a = clinic({ google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123', google_place_id_checked_at: '2026-10-01' });
  const b = clinic({ slug: 'clinica-ejemplo-2', google_place_id: 'ChIJ_EJEMPLO_SINTETICO_123', google_place_id_checked_at: '2026-10-01' });
  const issues = validateCatalog([{ slug: a.slug, clinic: a }, { slug: b.slug, clinic: b }], { now });
  assert.deepEqual(issues.map((issue) => `${issue.slug}:${issue.code}`), ['clinica-ejemplo:place_id_duplicate', 'clinica-ejemplo-2:place_id_duplicate']);
});

test('derivation_mismatch: VERIFIED o *_verified a mano sin evidencia hace fallar', () => {
  const manual = check({ record_status: 'VERIFIED' });
  assert.deepEqual(codes(manual), ['derivation_mismatch']);
  assert.match(manual[0].message, /record_status VERIFIED \(evidencia: PARTIAL\)/);
  assert.deepEqual(codes(check({ phone_verified: true })), ['derivation_mismatch']);
  assert.deepEqual(codes(check({ officially_confirmed: true })), ['derivation_mismatch']);
  assert.deepEqual(codes(check({ record_status: 'REVIEW_REQUIRED' })), [], 'ser más conservador está permitido');
  const evidence = parseEvidence(JSON.parse(readFileSync(new URL('../fixtures/clinics/evidence-v2-verified.json', import.meta.url), 'utf8')), 'clinica-ejemplo');
  assert.equal(evidence.success, true);
  const backed = { record_status: 'VERIFIED', officially_confirmed: true, phone_verified: true, address_verified: true, schedule_verified: true };
  assert.deepEqual(codes(check(backed, { evidence: evidence.success ? evidence.data : null })), []);
});

const baseline = (entries: DebtBaseline['entries']): DebtBaseline => ({ schemaVersion: 1, description: 'x', baselineCommit: 'b2b490b', generatedAt: '2026-10-18T00:00:00Z', reviewRef: 'https://github.com/Gunz-cop/Vet24-cr/issues/29', googleDerivedCoordinates: [], entries });

test('base de deuda: perdona solo el valor exacto; cambios y fichas nuevas fallan', () => {
  const legacyClinic = clinic({ latitude: 9.917, longitude: -84.096, location_source: 'legacy_unknown', location_verified_at: undefined });
  const legacyIssues = validateClinicRecord(legacyClinic, { now });
  const base = buildDebtBaseline(legacyIssues, null, { baselineCommit: 'b2b490b', generatedAt: '2026-10-18T00:00:00Z', reviewRef: 'https://github.com/Gunz-cop/Vet24-cr/issues/29', description: 'x' });
  assert.equal(debtBaselineSchema.safeParse(base).success, true);
  assert.deepEqual(base.entries.map((entry) => entry.ruleId), ['coord_precision', 'coord_source']);
  const intact = applyDebtBaseline(legacyIssues, base);
  assert.deepEqual([intact.errors.length, intact.debt.length, intact.stale.length], [0, 2, 0]);
  // La ficha cambia sus coordenadas pero sigue con 3 decimales: regresión.
  const moved = applyDebtBaseline(validateClinicRecord({ ...legacyClinic, latitude: 9.918 }, { now }), base);
  assert.deepEqual(codes(moved.errors), ['coord_precision', 'coord_source']);
  assert.equal(moved.stale.length, 2);
  // Una ficha nueva con el mismo problema no hereda la exención de otra.
  const other = applyDebtBaseline(validateClinicRecord({ ...legacyClinic, slug: 'nueva' }, { now }), base);
  assert.equal(other.errors.length, 2);
  // Corregida: la deuda queda obsoleta y se puede retirar.
  const fixed = applyDebtBaseline(validateClinicRecord(clinic(), { now }), base);
  assert.deepEqual([fixed.errors.length, fixed.stale.length], [0, 2]);
  // Los errores que no son deuda nunca se perdonan.
  const zero = validateClinicRecord({ ...legacyClinic, latitude: 0 }, { now });
  assert.deepEqual(codes(applyDebtBaseline(zero, baseline([{ slug: 'clinica-ejemplo', ruleId: 'coord_zero', field: 'latitude', value: '', reason: 'x' }])).errors), ['coord_zero']);
});

test('base de deuda: contrato estricto, orden estable y motivos conservados', () => {
  const entry = { slug: 'b', ruleId: 'coord_source', field: 'location_source', value: '9.9,-84.1', reason: 'x' };
  assert.equal(debtBaselineSchema.safeParse(baseline([entry, entry])).success, false, 'duplicada');
  assert.equal(debtBaselineSchema.safeParse(baseline([entry, { ...entry, slug: 'a' }])).success, false, 'desordenada');
  assert.equal(debtBaselineSchema.safeParse(baseline([{ ...entry, extra: 1 } as never])).success, false, 'claves exactas');
  const issues = check({ location_source: 'legacy_unknown', location_verified_at: undefined });
  const previous = baseline([{ slug: 'clinica-ejemplo', ruleId: 'coord_source', field: 'location_source', value: '9.91751,-84.09623', reason: 'Motivo escrito a mano' }]);
  const rebuilt = buildDebtBaseline(issues, previous, { baselineCommit: 'b2b490b', generatedAt: '2026-10-19T00:00:00Z', reviewRef: previous.reviewRef, description: 'x' });
  assert.equal(rebuilt.entries[0].reason, 'Motivo escrito a mano');
  const text = serializeDebtBaseline(rebuilt);
  assert.deepEqual(JSON.parse(text), rebuilt);
  assert.match(text, /\n {4}\{"slug":"clinica-ejemplo",.*\}\n {2}\]\n\}\n$/);
});

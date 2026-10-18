import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { costaRicaDate, deriveVerification, effectiveReviewBy, evidenceSchema, evidenceV2Schema, parseEvidence, type EvidenceV2 } from '../../src/lib/clinic-evidence.ts';

const fixture = (name: string) => JSON.parse(readFileSync(new URL(`../fixtures/clinics/${name}`, import.meta.url), 'utf8'));
const v2 = (): EvidenceV2 => structuredClone(fixture('evidence-v2-verified.json'));
const at = (day: string) => new Date(`${day}T12:00:00-06:00`);
const rejects = (value: unknown, pattern: RegExp) => {
  const result = evidenceSchema.safeParse(value);
  assert.equal(result.success, false, 'debía rechazarse');
  if (!result.success) assert.match(result.error.issues.map((issue) => issue.message).join(' | '), pattern);
};

test('v1 del panel se sigue leyendo y conserva las reglas de validSidecar', () => {
  const v1 = fixture('evidence-v1-panel.json');
  assert.equal(parseEvidence(v1, 'clinica-ejemplo').success, true);
  assert.equal(parseEvidence(v1, 'otra-clinica').success, false, 'slug distinto');
  assert.equal(evidenceSchema.safeParse({ ...v1, extra: 1 }).success, false, 'claves exactas');
  assert.equal(evidenceSchema.safeParse({ ...v1, fuentes: [{ url: 'http://clinica.cr', tipo: 'publica' }] }).success, false, 'url HTTPS obligatoria en v1');
  assert.equal(evidenceSchema.safeParse({ ...v1, facts: [{ ...v1.facts[0], references: [1] }] }).success, false, 'referencia fuera de rango');
  assert.equal(evidenceSchema.safeParse({ ...v1, facts: [{ field: 'direccion', references: [0], confidence: 'medium' }] }).success, false, 'value obligatorio');
  assert.equal(evidenceSchema.safeParse({ ...v1, observedAt: '2026-10-18T15:00:00-06:00' }).success, false, 'UTC con Z');
});

test('v2 sintética válida y forma del ejemplo del diseño', () => {
  const result = parseEvidence(v2(), 'clinica-ejemplo');
  assert.equal(result.success, true, JSON.stringify(result));
  assert.equal(evidenceV2Schema.safeParse({ ...v2(), extra: true }).success, false);
});

test('v2 rechaza referencias a fuentes inexistentes, duplicadas y confirmed solo con legado', () => {
  const missing = v2(); missing.facts[0].sources = ['s9'];
  rejects(missing, /Fuente inexistente: s9/);
  const conflict = v2(); conflict.conflicts = [{ field: 'telefono1', values: ['2254-1920'], sources: ['nada'], status: 'open' }];
  rejects(conflict, /Fuente inexistente: nada/);
  const duplicated = v2(); duplicated.sources.push({ ...duplicated.sources[0] });
  rejects(duplicated, /Fuente duplicada: s1/);
  const legacy = v2(); legacy.sources.push({ id: 's4', kind: 'legacy', consultedAt: '2026-10-20T15:00:00Z', capturedBy: 'operator' });
  legacy.facts[0].sources = ['s4'];
  rejects(legacy, /confirmed sin fuente verificable/);
  legacy.facts[0].status = 'reported';
  assert.equal(evidenceSchema.safeParse(legacy).success, true, 'el legado sí puede respaldar un reported');
});

test('v2 exige url salvo confirmación directa u observación, y reference/method en la confirmación', () => {
  const noUrl = v2(); delete noUrl.sources[0].url;
  rejects(noUrl, /official_site requiere url/);
  const noReference = v2(); delete noReference.sources[2].reference;
  rejects(noReference, /requiere reference/);
  const phoneReference = v2(); phoneReference.sources[2].reference = 'tel-89933471';
  rejects(phoneReference, /números telefónicos/);
  const observation = v2(); observation.sources.push({ id: 'pin', kind: 'operator_observation', consultedAt: '2026-10-20T15:00:00Z', capturedBy: 'operator' });
  assert.equal(evidenceSchema.safeParse(observation).success, true);
});

test('v2: location con fuente almacenable, códigos sin valores y conflicto resuelto con regla', () => {
  const google = v2(); (google.facts[2].value as Record<string, unknown>).location_source = 'google';
  rejects(google, /location exige/);
  const legacy = v2(); (legacy.facts[2].value as Record<string, unknown>).location_source = 'legacy_unknown';
  rejects(legacy, /location exige/);
  for (const code of ['phone_extra:22541920', 'Hours', 'hours_mismatch:9', 'coord:9.9175,-84.0962']) {
    const bad = v2(); bad.checks[0].codes = [code];
    assert.equal(evidenceSchema.safeParse(bad).success, false, code);
  }
  const ok = v2(); ok.checks[0].codes = ['hours_mismatch:0,6', 'inaccessible:js_required', 'coord_drift_150', 'closed_permanently'];
  assert.equal(evidenceSchema.safeParse(ok).success, true);
  const resolved = v2(); resolved.conflicts = [{ field: 'telefono1', values: ['2254-1920'], sources: ['s1'], status: 'resolved' }];
  rejects(resolved, /requiere resolution/);
  const ref = v2(); ref.externalRefs = { emergencyAccess: 'research/emergency-access-evidence.json#otra' };
  rejects(ref, /mismo slug/);
});

test('frescura: reviewBy efectivo nunca supera la política (§4.5)', () => {
  const fact = v2().facts[0];
  assert.equal(effectiveReviewBy({ ...fact, reviewBy: '2099-01-01' }), '2027-10-20', 'teléfono: 365 días');
  assert.equal(effectiveReviewBy({ ...fact, field: 'schedule_v1.days.3', reviewBy: '2099-01-01' }), '2027-04-18', 'horario: 180 días');
  assert.equal(effectiveReviewBy({ ...fact, reviewBy: '2026-11-01' }), '2026-11-01', 'el declarado si es menor');
  assert.equal(effectiveReviewBy({ ...fact, field: 'web', reviewBy: '2099-01-01' }), '2099-01-01', 'sin política');
  assert.equal(costaRicaDate(new Date('2026-10-21T05:59:00Z')), '2026-10-20');
});

test('deriveVerification: VERIFIED solo con teléfono, ubicación y horario confirmados y vigentes', () => {
  const derived = deriveVerification(v2(), at('2026-10-21'));
  assert.deepEqual(derived, {
    phone_verified: true,
    address_verified: true,
    schedule_verified: true,
    last_verified: '2026-10-20',
    verification_source: 'Confirmación directa de la clínica',
    record_status: 'VERIFIED',
    officially_confirmed: true,
  });
  // El horario vence a los 180 días aunque reviewBy diga otra cosa.
  const late = v2(); late.facts[1].reviewBy = '2099-01-01';
  const expired = deriveVerification(late, at('2027-04-19'));
  assert.equal(expired.schedule_verified, false);
  assert.equal(expired.record_status, 'PARTIAL');
  assert.equal(expired.phone_verified, true);
});

test('deriveVerification: sin evidencia, v1 o reportado no verifica nada', () => {
  const none = deriveVerification(null, at('2026-10-21'));
  assert.deepEqual(none, { phone_verified: false, address_verified: false, schedule_verified: false, last_verified: '', verification_source: 'Sin fuente verificable', record_status: 'PARTIAL', officially_confirmed: false });
  assert.deepEqual(deriveVerification(fixture('evidence-v1-panel.json'), at('2026-10-21')), none);
  const reported = v2(); for (const fact of reported.facts) fact.status = 'reported';
  assert.deepEqual(deriveVerification(reported, at('2026-10-21')), none);
});

test('deriveVerification: conflictos, cierres y 24/7 contradictorio llevan a REVIEW_REQUIRED', () => {
  const conflict = v2(); conflict.conflicts = [{ field: 'schedule_v1.days.0', values: [{ kind: 'closed' }], sources: ['s1', 's2'], status: 'open', resolution: 'R1' }];
  const derived = deriveVerification(conflict, at('2026-10-21'));
  assert.equal(derived.record_status, 'REVIEW_REQUIRED');
  assert.equal(derived.schedule_verified, false, 'el conflicto abierto anula el grupo');
  assert.equal(derived.phone_verified, true);
  conflict.conflicts[0].status = 'resolved';
  assert.equal(deriveVerification(conflict, at('2026-10-21')).record_status, 'VERIFIED');
  for (const check of [{ outcome: 'closed_permanently', codes: [] }, { outcome: 'discrepancy', codes: ['hours_24_conflict'] }] as const) {
    const closed = v2(); closed.checks.push({ provider: 'google_places', checkedAt: '2026-10-20T15:31:00Z', ...check, codes: [...check.codes] });
    assert.equal(deriveVerification(closed, at('2026-10-21')).record_status, 'REVIEW_REQUIRED', check.outcome);
  }
});

test('deriveVerification: la fuente pública nunca es Google y baja de rango sin confirmación directa', () => {
  const site = v2();
  site.sources = site.sources.filter((source) => source.kind !== 'direct_confirmation');
  for (const fact of site.facts) fact.sources = fact.sources.filter((id) => id !== 's3').concat(fact.sources.includes('s1') ? [] : ['s1']);
  const derived = deriveVerification(site, at('2026-10-21'));
  assert.equal(derived.verification_source, 'Sitio oficial');
  assert.equal(derived.officially_confirmed, false);
});

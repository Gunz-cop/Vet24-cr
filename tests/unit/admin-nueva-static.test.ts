import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../../src/pages/admin/nueva.astro', import.meta.url), 'utf8');

test('nueva ficha usa capacidades triestado y bloquea unknown', () => {
  assert.match(page, /value="unknown" selected/);
  assert.match(page, /unknownCapabilities/);
  assert.match(page, /Indica explícitamente estas capacidades/);
  assert.match(page, /Object\.fromEntries\(Object\.keys\(capabilityLabels\)/);
  assert.doesNotMatch(page, /input type="checkbox" name="(?:emergencias24h|atiendeExoticos|cirugiaEmergencia|atiendeGranja|atiendePeces|hotelMascotas|has_surgery|has_hospitalization|overnight_doctor_present|accepts_emergency_walkins)"/);
});

test('nueva ficha permite intervalos open sin horas precargadas', () => {
  assert.match(page, /value="\$\{range\.start\}"/);
  assert.match(page, /class="new-schedule-kind"/);
  assert.match(page, /add-interval/);
  assert.match(page, /Completa inicio y fin de cada intervalo/);
  assert.match(page, /kind: 'open', intervals/);
});

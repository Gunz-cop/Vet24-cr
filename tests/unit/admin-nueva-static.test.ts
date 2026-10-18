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

test('nueva ficha genera Waze/Maps por texto con buildNavLinks, nunca por coordenadas', () => {
  assert.match(page, /import \{ buildNavLinks \} from '\.\.\/\.\.\/lib\/clinic-lookup\/nav-links\.ts'/);
  assert.match(page, /\.\.\.buildNavLinks\(\{ nombre: value\('#new-name'\), direccion: value\('#new-address'\)/);
  assert.doesNotMatch(page, /ul\?ll=|query=\$\{lat\}/);
});

test('nueva ficha exige fuente almacenable y 4 decimales en las coordenadas', () => {
  assert.match(page, /<select id="new-location-source" required>/);
  assert.doesNotMatch(page, /value="(?:google|legacy_unknown)"/);
  assert.match(page, /location_source: value\('#new-location-source'\), location_verified_at: locationVerifiedAt/);
  assert.match(page, /Math\.min\(decimals\(lat\), decimals\(lng\)\) < 4/);
});

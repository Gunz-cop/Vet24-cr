import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNavLinks, navSearchText } from '../../src/lib/clinic-lookup/nav-links.ts';
import { navLinkProblems } from '../../src/lib/clinic-validate.ts';

test('buildNavLinks busca por nombre y dirección, como los botones públicos', () => {
  const links = buildNavLinks({ nombre: 'Hospital Veterinario VEHASA (Beasa)', direccion: 'Centro Comercial Vehasa, Hatillo Centro, San José', zona: 'Hatillo', provincia: 'San José' });
  const text = 'Hospital Veterinario VEHASA (Beasa), Centro Comercial Vehasa, Hatillo Centro, San José, Costa Rica';
  assert.equal(links.waze_url, `https://waze.com/ul?q=${encodeURIComponent(text)}&navigate=yes`);
  assert.equal(links.maps_url, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`);
  assert.equal(new URL(links.waze_url).searchParams.get('q'), text);
  assert.equal(new URL(links.maps_url).searchParams.get('query'), text);
  assert.doesNotMatch(links.waze_url + links.maps_url, /ll=|query=-?\d|q=-?\d/);
  assert.deepEqual(navLinkProblems('waze_url', links.waze_url), []);
  assert.deepEqual(navLinkProblems('maps_url', links.maps_url), []);
});

test('navSearchText: respaldo por zona/provincia, sin duplicar Costa Rica y con tope de longitud', () => {
  assert.equal(navSearchText({ nombre: '  Vet   Uno ', zona: 'Liberia', provincia: 'Guanacaste' }), 'Vet Uno, Liberia, Guanacaste, Costa Rica');
  assert.equal(navSearchText({ nombre: 'Vet Uno', direccion: 'Liberia, Guanacaste, Costa Rica' }), 'Vet Uno, Liberia, Guanacaste, Costa Rica');
  assert.equal(navSearchText({ nombre: 'Vet Uno', direccion: 'San José, COSTA RÍCA' }), 'Vet Uno, San José, COSTA RÍCA');
  assert.equal(navSearchText({ nombre: 'Vet Uno' }), 'Vet Uno, Costa Rica');
  const long = navSearchText({ nombre: 'Vet', direccion: 'calle '.repeat(200) });
  assert.ok(long.length <= 300, String(long.length));
  assert.ok(buildNavLinks({ nombre: 'Vet', direccion: 'ñ'.repeat(5000) }).maps_url.length <= 2048);
  assert.throws(() => buildNavLinks({ nombre: '   ' }), /nombre/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROBOTS_PATH = 'public/robots.txt';
const CONTENT_SIGNAL_LINE = 'Content-Signal: search=yes, ai-input=yes, ai-train=no';

test('robots.txt conserva rastreo y sitemap', () => {
  const raw = readFileSync(ROBOTS_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  assert.ok(lines.includes('User-agent: *'), 'falta el bloque comodín User-agent: *');
  assert.ok(lines.includes('Allow: /'), 'falta Allow: /');
  assert.ok(
    lines.includes('Sitemap: https://vet24cr.com/sitemap-index.xml'),
    'falta la directiva Sitemap',
  );
});

test('robots.txt declara Content-Signal una sola vez dentro del bloque comodín', () => {
  const raw = readFileSync(ROBOTS_PATH, 'utf8');
  const lines = raw.split(/\r?\n/);

  const occurrences = lines.filter((line) => line.startsWith('Content-Signal:'));
  assert.equal(occurrences.length, 1, 'Content-Signal debe aparecer exactamente una vez');
  assert.equal(
    occurrences[0],
    CONTENT_SIGNAL_LINE,
    'la directiva debe coincidir exactamente con la política D1 aprobada',
  );

  const wildcardIndex = lines.indexOf('User-agent: *');
  const signalIndex = lines.indexOf(occurrences[0]);
  const blockEnd = lines.findIndex((line, i) => i > wildcardIndex && line.trim() === '');

  assert.ok(wildcardIndex !== -1, 'no se encontró el bloque comodín');
  assert.ok(
    signalIndex > wildcardIndex && (blockEnd === -1 || signalIndex < blockEnd),
    'Content-Signal debe estar dentro del bloque User-agent: *, antes de la línea en blanco',
  );
});

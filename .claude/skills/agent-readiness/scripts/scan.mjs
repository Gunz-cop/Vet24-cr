#!/usr/bin/env node
/**
 * Escáner de preparación para agentes, contra la API de isitagentready.com.
 *
 *   node scan.mjs https://midominio.com [--json] [--check id,id]
 *
 * Por qué existe este script y no un enlace a la web: la página de
 * isitagentready.com renderiza el resultado en el navegador y su ruta
 * `/<dominio>` devuelve 404 al servidor, así que no se puede leer con curl ni
 * con una herramienta de fetch. El escaneo real es un POST a `/api/scan` con
 * la lista de comprobaciones. Eso es lo que hace este archivo, y es lo que
 * permite auditar desde CI o desde una sesión de agente.
 *
 * La respuesta trae, por cada comprobación, su `status`, un `message` y la
 * evidencia: qué URL se pidió, qué devolvió y qué se concluyó. La evidencia es
 * la parte útil cuando algo falla, porque dice exactamente qué esperaba el
 * escáner.
 */

const API = 'https://isitagentready.com/api/scan';

/** Las 21 comprobaciones. `a2aAgentCard` viene desmarcada en la web; aquí se incluye. */
const TODAS = [
  'robotsTxt', 'sitemap', 'linkHeaders', 'dnsAid',
  'markdownNegotiation',
  'robotsTxtAiRules', 'contentSignals', 'webBotAuth',
  'apiCatalog', 'oauthDiscovery', 'oauthProtectedResource', 'authMd',
  'mcpServerCard', 'a2aAgentCard', 'agentSkills', 'webMcp', 'ard',
  'x402', 'mpp', 'ucp', 'acp'
];

const ICONO = { pass: '✅', fail: '❌', neutral: '⚪', skipped: '⏭️' };

function parseArgs(argv) {
  const args = { url: null, json: false, checks: TODAS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--check') args.checks = String(argv[++i] ?? '').split(',').filter(Boolean);
    else if (!a.startsWith('-')) args.url = a;
  }
  return args;
}

const { url, json, checks } = parseArgs(process.argv.slice(2));

if (!url) {
  console.error('Uso: node scan.mjs https://midominio.com [--json] [--check robotsTxt,sitemap]');
  process.exit(2);
}

const response = await fetch(API, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, enabledChecks: checks })
});

if (!response.ok) {
  console.error(`El escáner devolvió ${response.status}: ${await response.text()}`);
  process.exit(1);
}

const data = await response.json();

if (json) {
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}

console.log(`\n${data.targetUrl}`);
console.log(`Nivel ${data.level} — ${data.levelName}   (${data.scannedAt})\n`);

let fallos = 0;
for (const [categoria, comprobaciones] of Object.entries(data.checks)) {
  console.log(`  ${categoria}`);
  for (const [id, c] of Object.entries(comprobaciones)) {
    if (c.status === 'fail') fallos++;
    console.log(`    ${ICONO[c.status] ?? '  '} ${id.padEnd(24)} ${c.message}`);
  }
  console.log();
}

// El siguiente nivel viene con la instruccion exacta de que falta. Es la parte
// mas util de la respuesta y la que la interfaz web esconde.
if (data.nextLevel) {
  console.log(`  Para el nivel ${data.nextLevel.target} — ${data.nextLevel.name}:`);
  for (const r of data.nextLevel.requirements) {
    console.log(`    · ${r.check}: ${r.description}`);
    if (r.skillUrl) console.log(`      guía: ${r.skillUrl}`);
  }
  console.log();
}

// Al fallar algo, la evidencia dice que URL se pidio y que se esperaba.
if (fallos > 0) {
  console.log('  Evidencia de lo que falla (usar --json para el detalle completo):');
  for (const comprobaciones of Object.values(data.checks)) {
    for (const [id, c] of Object.entries(comprobaciones)) {
      if (c.status !== 'fail') continue;
      for (const e of c.evidence ?? []) {
        const req = e.request?.url ? `${e.request.method} ${e.request.url}` : e.label;
        const res = e.response?.status ? ` → ${e.response.status}` : '';
        console.log(`    ${id}: ${req}${res}`);
      }
    }
  }
  console.log();
}

process.exit(0);

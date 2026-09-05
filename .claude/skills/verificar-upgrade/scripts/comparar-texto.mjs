/**
 * Compara el TEXTO RENDERIZADO de dos builds, modelando cómo lo une el
 * navegador: un elemento inline NO aporta espacio, uno de bloque sí.
 *
 * Para qué sirve: detecta palabras que se pegan o se separan cuando cambia el
 * tratamiento de espacios en blanco (p. ej. compressHTML: 'jsx' en Astro 7).
 *
 * DOS TRAMPAS, las dos reales:
 *
 * 1) Falso NEGATIVO. Si tratás cada etiqueta como un espacio, "a</span> <span>b"
 *    y "a</span><span>b" dan el mismo texto y el defecto pasa desapercibido.
 *    Por eso aquí las inline se sustituyen por NADA. Un detector escrito de la
 *    forma "obvia" dice "cero diferencias" con el sitio roto.
 *
 * 2) Falso POSITIVO. Este script no ve el CSS. En un contenedor flex con `gap`
 *    el espacio nunca contaba y quitarlo no cambia nada visualmente, pero aquí
 *    aparece igual. Por eso la salida son CANDIDATOS, no defectos: hay que
 *    mirar el CSS del contenedor de cada uno, y confirmar con comparar-visual.
 *
 * Uso: node comparar-texto.mjs --base <dirBase> --nuevo <dirNuevo>
 */
import fs from 'node:fs';
import path from 'node:path';

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const BASE = arg('base');
const NUEVO = arg('nuevo');
if (!BASE || !NUEVO) {
  console.error('Uso: node comparar-texto.mjs --base <dirBase> --nuevo <dirNuevo>');
  process.exit(1);
}

const INLINE = new Set([
  'a', 'span', 'strong', 'em', 'b', 'i', 'code', 'small', 'abbr', 'time',
  'sup', 'sub', 'mark', 'u', 's', 'label', 'svg', 'path', 'button', 'img', 'br'
]);

const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'",
  nbsp: ' ', ndash: '–', mdash: '—', hellip: '…'
};

function renderizar(archivo) {
  let s = fs.readFileSync(archivo, 'utf8');
  // script y style no son texto visible
  s = s.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '\n');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  // inline -> nada (el navegador tampoco mete espacio); bloque -> salto
  s = s.replace(/<(\/?[a-zA-Z0-9]+)[^>]*>/g, (_, t) =>
    INLINE.has(t.toLowerCase().replace('/', '')) ? '' : '\n');
  s = s.replace(/&(#?\w+);/g, (m, e) => ENTIDADES[e] ?? m);
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function* htmls(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmls(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

/** Clave estructurada: evita partir por un separador que puede estar en el texto. */
const patrones = new Map();
let comparadas = 0;
let afectadas = 0;

for (const nuevo of htmls(NUEVO)) {
  const rel = path.relative(NUEVO, nuevo);
  const base = path.join(BASE, rel);
  if (!fs.existsSync(base)) continue;
  comparadas++;
  const a = renderizar(base);
  const b = renderizar(nuevo);
  if (a.length === b.length && a.every((l, i) => l === b[i])) continue;
  afectadas++;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    const clave = JSON.stringify([a[i].slice(0, 95), b[i].slice(0, 95)]);
    patrones.set(clave, (patrones.get(clave) ?? 0) + 1);
  }
}

console.log(`páginas comparadas: ${comparadas}`);
console.log(`páginas con texto renderizado distinto: ${afectadas}`);

if (patrones.size === 0) {
  console.log('\n=> Sin candidatos.');
  process.exit(0);
}

console.log(`\nCANDIDATOS (${patrones.size} patrones distintos).`);
console.log('Cada uno hay que confirmarlo: mirá el CSS del contenedor.');
console.log('Si es flex con gap, es falso positivo. Confirmá con comparar-visual.\n');

const orden = [...patrones.entries()].sort((x, y) => y[1] - x[1]).slice(0, 20);
for (const [clave, cuenta] of orden) {
  const [a, b] = JSON.parse(clave);
  console.log(`[${String(cuenta).padStart(4)} pág]`);
  console.log(`   base : ${a}`);
  console.log(`   nuevo: ${b}`);
}

process.exit(1);

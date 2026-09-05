/**
 * Ejercita la interactividad del directorio en dos builds y compara resultados.
 *
 * Por qué hace falta: un cambio de bundler o de minificador (Vite 7 -> 8 pasó a
 * Rolldown) reescribe los scripts inline. El HTML puede salir perfecto y el
 * build en verde mientras el buscador dejó de filtrar. Comparar archivos no lo
 * detecta: hay que hacer clic.
 *
 * Compara CONTEO de resultados, no texto extraído del DOM: el conteo es
 * insensible a los cambios de espaciado que este mismo upgrade puede introducir,
 * así que no se mezcla una cosa con la otra.
 *
 * Uso: node probar-interaccion.mjs [--base-puerto 8081] [--nuevo-puerto 8082]
 *                                  [--ruta /] [--buscar ollama]
 * Requiere los dos servidores ya levantados (ver servir.mjs).
 */
import { abrirNavegador } from './lib/navegador.mjs';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? process.argv[i + 1] : d;
};
const P_BASE = Number(arg('base-puerto', 8081));
const P_NUEVO = Number(arg('nuevo-puerto', 8082));
const RUTA = arg('ruta', '/');
const TERMINO = arg('buscar', 'ollama');

const browser = await abrirNavegador();

async function medir(puerto) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', (e) => errores.push(e.message));
  await pg.goto(`http://localhost:${puerto}${RUTA}`, { waitUntil: 'load' });
  await pg.waitForTimeout(700);

  const visibles = () =>
    pg.$$eval('#tools-grid > *', (els) => els.filter((e) => getComputedStyle(e).display !== 'none').length);

  const r = {};
  r.inicial = await visibles();

  // buscador
  await pg.fill('#directory-search', TERMINO);
  await pg.waitForTimeout(500);
  r.busca_termino = await visibles();
  await pg.fill('#directory-search', 'zzzznoexisteseguro');
  await pg.waitForTimeout(500);
  r.busca_sin_resultados = await visibles();
  await pg.fill('#directory-search', '');
  await pg.waitForTimeout(500);
  r.tras_limpiar = await visibles();

  // chips de categoría
  const chips = await pg.$$('#need-chips .fai-chip');
  r.num_chips = chips.length;
  if (chips[1]) {
    await chips[1].click();
    await pg.waitForTimeout(500);
    r.tras_chip = await visibles();
    r.chip_pressed = await chips[1].getAttribute('aria-pressed');
  }
  if (chips[0]) {
    await chips[0].click();
    await pg.waitForTimeout(500);
    r.tras_reset = await visibles();
  }

  // filtros de plataforma
  const filtros = await pg.$$('#secondary-filters button');
  r.num_filtros = filtros.length;
  if (filtros[1]) {
    await filtros[1].click();
    await pg.waitForTimeout(500);
    r.tras_filtro = await visibles();
  }

  r.errores_js = errores.length;
  await ctx.close();
  return { r, errores };
}

const base = await medir(P_BASE);
const nuevo = await medir(P_NUEVO);
await browser.close();

const claves = [...new Set([...Object.keys(base.r), ...Object.keys(nuevo.r)])];
console.log('clave'.padEnd(24) + 'base'.padEnd(14) + 'nuevo');
let dif = 0;
for (const k of claves) {
  const a = JSON.stringify(base.r[k]);
  const b = JSON.stringify(nuevo.r[k]);
  if (a !== b) dif++;
  console.log(`${a === b ? '  ' : '!!'} ${k.padEnd(22)}${String(a).padEnd(14)}${b}`);
}

for (const [n, o] of [['base', base], ['nuevo', nuevo]]) {
  if (o.errores.length) {
    console.log(`\nerrores de JS en ${n}:`);
    o.errores.slice(0, 10).forEach((e) => console.log('   ', e));
  }
}

const hayErrores = base.r.errores_js > 0 || nuevo.r.errores_js > 0;
console.log(dif === 0 && !hayErrores
  ? '\n=> Comportamiento idéntico, sin errores de JS.'
  : `\n=> ${dif} diferencias de comportamiento${hayErrores ? ' y errores de JS' : ''}.`);
process.exit(dif === 0 && !hayErrores ? 0 : 1);

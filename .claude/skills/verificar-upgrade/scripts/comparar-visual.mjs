/**
 * Compara dos builds píxel a píxel en Chromium, con control de determinismo.
 *
 * Por qué el control: el sitio tiene animaciones de entrada (.fai-rise) que
 * hacen que dos capturas del MISMO build difieran. Sin medir ese ruido primero,
 * cualquier diferencia parece una regresión. El script corre SIEMPRE una pasada
 * base-contra-base antes de la real; si esa no sale limpia, avisa y no deja
 * sacar conclusiones de la comparación real.
 *
 * Uso:
 *   node comparar-visual.mjs --base <dirBase> --nuevo <dirNuevo> [--rutas a,b,c]
 *                            [--ancho 1280] [--con-animaciones]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { abrirNavegador } from './lib/navegador.mjs';

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > -1 ? (process.argv[i + 1]?.startsWith('--') ? true : process.argv[i + 1]) : d;
};
const BASE = arg('base'), NUEVO = arg('nuevo');
const ANCHO = Number(arg('ancho', 1280));
const ANIM = process.argv.includes('--con-animaciones');
if (!BASE || !NUEVO) { console.error('Faltan --base y --nuevo'); process.exit(1); }

/**
 * Rutas representativas, sin nombres cableados.
 *
 * Agrupa por FORMA conservando la profundidad, para que /es/categoria/x no caiga
 * en el mismo saco que /es/acerca-de: son plantillas distintas. Dentro de cada
 * forma toma la más pesada, la mediana y la más liviana.
 *
 * La mediana no es decorativa: la forma `/<lang>/*` mezcla las 150 fichas con
 * media docena de páginas legales, y los extremos de peso caen justo en las
 * legales y en la app de hardware. Sin la mediana, el muestreo se saltaba
 * enteras las fichas, que son el grueso del sitio y donde aparecieron los
 * defectos reales del upgrade a Astro 7.
 */
function rutasAuto(dir) {
  const paginas = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'index.html') {
        const rel = path.relative(dir, d).split(path.sep).join('/');
        paginas.push({ ruta: rel ? `/${rel}` : '/', peso: fs.statSync(p).size });
      }
    }
  })(dir);

  const porForma = new Map();
  for (const pg of paginas) {
    const segs = pg.ruta.split('/').filter(Boolean);
    const forma = segs.length === 0
      ? '/'
      : segs.map((s, i) => (i === 0 && /^[a-z]{2}$/.test(s) ? s : '*')).join('/');
    if (!porForma.has(forma)) porForma.set(forma, []);
    porForma.get(forma).push(pg);
  }

  const sel = new Set();
  for (const [, pgs] of porForma) {
    pgs.sort((a, b) => b.peso - a.peso);
    sel.add(pgs[0].ruta);                                    // la más pesada
    sel.add(pgs[Math.floor(pgs.length / 2)].ruta);           // la mediana
    sel.add(pgs[pgs.length - 1].ruta);                       // la más liviana
  }
  return [...sel].sort().slice(0, 24);
}

const RUTAS = (arg('rutas') && typeof arg('rutas') === 'string')
  ? arg('rutas').split(',')
  : rutasAuto(NUEVO);

const servidores = [];
function servir(dir, puerto) {
  const p = spawn(process.execPath, [path.join(import.meta.dirname, 'servir.mjs'), dir, String(puerto)],
    { stdio: 'ignore' });
  servidores.push(p);
}
servir(BASE, 8081);
servir(NUEVO, 8082);
await new Promise(r => setTimeout(r, 1500));

async function capturar(puerto, ruta, browser) {
  const ctx = await browser.newContext({
    viewport: { width: ANCHO, height: 900 },
    deviceScaleFactor: 1,
    ...(ANIM ? {} : { reducedMotion: 'reduce' })
  });
  const pg = await ctx.newPage();
  const errores = [];
  pg.on('pageerror', e => errores.push(e.message));
  const r = await pg.goto(`http://localhost:${puerto}${ruta}`, { waitUntil: 'load' });
  const estado = r ? r.status() : 0;
  await pg.waitForTimeout(600);
  const png = await pg.screenshot({ fullPage: true });
  await ctx.close();
  return { png, errores, estado };
}

/** Diff de píxeles decodificando los PNG con el propio navegador. */
async function diff(pagina, a, b) {
  return pagina.evaluate(async ([da, db]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(da), load(db)]);
    if (ia.width !== ib.width || ia.height !== ib.height)
      return { dim: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const px = img => { const c = document.createElement('canvas'); c.width = ia.width; c.height = ia.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.getContext('2d').getImageData(0, 0, ia.width, ia.height).data; };
    const pa = px(ia), pb = px(ib);
    let n = 0, minY = Infinity, maxY = -1;
    for (let i = 0; i < pa.length; i += 4)
      if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) {
        n++; const y = Math.floor((i / 4) / ia.width);
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    return { n, total: pa.length / 4, w: ia.width, h: ia.height, minY: n ? minY : -1, maxY };
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
}

const browser = await abrirNavegador();
const pagDiff = await (await browser.newContext()).newPage();

async function pasada(puertoA, puertoB, etiqueta) {
  const filas = [];
  for (const ruta of RUTAS) {
    const a = await capturar(puertoA, ruta, browser);
    const b = await capturar(puertoB, ruta, browser);
    if (a.estado !== 200 || b.estado !== 200) {
      filas.push({ ruta, err: `HTTP ${a.estado}/${b.estado} (ruta inexistente?)` });
      continue;
    }
    filas.push({ ruta, d: await diff(pagDiff, a.png, b.png), errores: [...a.errores, ...b.errores] });
  }
  return { etiqueta, filas };
}

function imprimir({ etiqueta, filas }) {
  console.log(`\n=== ${etiqueta} ===`);
  let sucias = 0, errs = 0;
  for (const f of filas) {
    if (f.err) { console.log(`  ?? ${f.ruta.padEnd(38)} ${f.err}`); continue; }
    errs += (f.errores?.length ?? 0);
    const d = f.d;
    if (d.dim) { sucias++; console.log(`  !! ${f.ruta.padEnd(38)} DIMENSIONES ${d.dim}`); }
    else if (d.n === 0) console.log(`  OK ${f.ruta.padEnd(38)} idéntico (${d.w}x${d.h})`);
    else { sucias++; console.log(`  !! ${f.ruta.padEnd(38)} ${d.n} px (${(d.n / d.total * 100).toFixed(4)}%) filas y=${d.minY}..${d.maxY}`); }
  }
  return { sucias, errs };
}

// 1) CONTROL: el build base contra sí mismo. Mide el ruido antes de nada.
const ctrl = imprimir(await pasada(8081, 8081, 'CONTROL (base vs base) — debe salir todo idéntico'));
if (ctrl.sucias > 0) {
  console.log(`\n  ATENCIÓN: el control NO es determinista (${ctrl.sucias} rutas).`);
  console.log('  Las diferencias de la comparación real NO son concluyentes.');
  console.log('  Causa habitual: animaciones de entrada. Quitá --con-animaciones,');
  console.log('  o subí la espera, antes de interpretar nada.');
}

// 2) REAL
const real = imprimir(await pasada(8081, 8082, 'REAL (base vs nuevo)'));
console.log(`\nerrores de JS en consola: ${real.errs}`);
console.log(ctrl.sucias === 0
  ? (real.sucias === 0 ? '\n=> Sin diferencias visuales.' : `\n=> ${real.sucias} rutas con diferencia REAL (control limpio).`)
  : '\n=> Resultado NO concluyente: arreglá el control primero.');

await browser.close();
for (const s of servidores) s.kill();
process.exit(ctrl.sucias === 0 && real.sucias === 0 ? 0 : 1);

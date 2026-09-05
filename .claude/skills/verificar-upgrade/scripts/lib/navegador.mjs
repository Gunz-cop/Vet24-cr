/**
 * Resolución de Playwright y del Chromium del entorno.
 *
 * Playwright no es dependencia del repo (no hace falta para construir el sitio),
 * así que estos scripts lo buscan donde suela estar y, si no aparece, lo
 * instalan en una carpeta temporal FUERA del repo — instalarlo dentro
 * ensuciaría package.json y el lockfile, que es justo lo que estamos midiendo.
 *
 * Aparte, el Chromium preinstalado del contenedor casi nunca coincide con el
 * build que espera la versión de Playwright que se instale, así que hay que
 * pasarle `executablePath` explícito en vez de dejar que lo busque solo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const CACHE = '/tmp/verif-navegador';

/**
 * Playwright se publica como CommonJS. Importarlo por ruta resuelta deja los
 * exports bajo `.default` en vez de sueltos, así que hay que normalizar o
 * `chromium` llega undefined.
 */
const normalizar = (mod) => (mod && mod.chromium ? mod : mod?.default);

/** Devuelve el módulo `playwright`, instalándolo en /tmp si hace falta. */
export async function cargarPlaywright() {
  const candidatos = [
    process.env.PLAYWRIGHT_PATH,
    path.join(CACHE, 'node_modules', 'playwright'),
    process.cwd()
  ].filter(Boolean);

  for (const c of candidatos) {
    try {
      const req = createRequire(path.join(c, 'noop.js'));
      const mod = normalizar(await import(req.resolve('playwright')));
      if (mod?.chromium) return mod;
    } catch { /* siguiente candidato */ }
  }
  try {
    const mod = normalizar(await import('playwright'));
    if (mod?.chromium) return mod;
  } catch { /* hay que instalarlo */ }

  console.error('Playwright no está disponible. Instalándolo en /tmp (fuera del repo)...');
  fs.mkdirSync(CACHE, { recursive: true });
  execSync('npm init -y >/dev/null 2>&1 && npm install playwright --silent', {
    cwd: CACHE, stdio: 'inherit', timeout: 300000
  });
  const req = createRequire(path.join(CACHE, 'noop.js'));
  const mod = normalizar(await import(req.resolve('playwright')));
  if (!mod?.chromium) throw new Error('No se pudo cargar playwright tras instalarlo en ' + CACHE);
  return mod;
}

/** Chromium preinstalado en la imagen; undefined deja que Playwright decida. */
export function buscarChromium() {
  const base = '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium-')).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

/** Lanza el navegador ya resuelto, con el ejecutable correcto. */
export async function abrirNavegador() {
  const { chromium } = await cargarPlaywright();
  const exe = buscarChromium();
  return chromium.launch(exe ? { executablePath: exe } : {});
}

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = process.cwd();
function files(path) {
  if (!existsSync(path)) return [];
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => files(join(path, entry.name)));
}
const legacy = files(join(root, 'functions')).filter((p) => /\.(js|mjs|cjs|ts)$/.test(p));
if (legacy.length) throw new Error(`Handlers legacy ejecutables encontrados: ${legacy.map((p) => p.slice(root.length + 1)).join(', ')}`);
const bundleIndex = process.argv.indexOf('--bundle');
const apiFiles = files(join(root, 'src', 'pages', 'api')).filter((p) => /\.(ts|js|mjs|cjs)$/.test(p));
const apiInventory = ['src/pages/api/admin/[...path].ts', 'src/pages/api/analytics.ts', 'src/pages/api/catalog.json.ts', 'src/pages/api/clinics-links-manifest.json.js', 'src/pages/api/cron-check-links.ts', 'src/pages/api/openapi.json.ts', 'src/pages/api/report-incorrect/index.ts', 'src/pages/api/status-override.ts'];
const apiRelative = apiFiles.map((p) => p.slice(root.length + 1).replaceAll('\\', '/'));
if (bundleIndex < 0 && (apiRelative.some((p) => !apiInventory.includes(p)) || apiInventory.some((p) => !apiRelative.includes(p)))) throw new Error(`Inventario API inesperado: ${apiRelative.join(', ')}`);
const mutators = apiFiles.filter((p) => /(?:export\s+(?:async\s+)?function\s+|export\s+const\s+)(?:POST|PUT|PATCH|DELETE|ALL)\b|export\s*\{[^}]*\b(?:POST|PUT|PATCH|DELETE|ALL)\b[^}]*\}\s*from/.test(readFileSync(p, 'utf8'))).map((p) => p.slice(root.length + 1).replaceAll('\\', '/'));
const allowedMutators = ['src/pages/api/admin/[...path].ts', 'src/pages/api/report-incorrect/index.ts', 'src/pages/api/analytics.ts', 'src/pages/api/cron-check-links.ts', 'src/pages/api/status-override.ts'];
if (mutators.some((p) => !allowedMutators.includes(p))) throw new Error(`API mutadora fuera de inventario permitido: ${mutators.join(', ')}`);
const targets = bundleIndex >= 0 ? [process.argv[bundleIndex + 1] || 'dist/server'] : ['src', 'scripts', 'wrangler.toml', 'astro.config.mjs', '.github', 'package.json'];
const self = resolve(root, 'scripts/admin/check-runtime-boundary.mjs');
const scan = targets.flatMap((d) => files(resolve(root, d))).filter((p) => resolve(p) !== self);
if (bundleIndex >= 0 && scan.length === 0) throw new Error('Artefacto bundle inexistente o vacío');
const text = scan.map((p) => readFileSync(p, 'utf8')).join('\n');
if (/ADMIN_SECRET/.test(text)) throw new Error('ADMIN_SECRET no puede aparecer en runtime/configuración/artefacto');
if (/wrangler\s+pages\s+deploy|pages\s+deploy|functions\//i.test(text)) throw new Error('Configuración de Pages/Functions detectada');
if (bundleIndex >= 0) {
  const bundleDir = resolve(root, targets[0]);
  const configPath = join(bundleDir, 'wrangler.json');
  if (!existsSync(configPath)) throw new Error('Configuración del bundle ausente');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!config.main || !existsSync(resolve(bundleDir, config.main))) throw new Error('Entry del bundle ausente');
  const allowedRoutes = apiInventory.map(p => '/' + p.replace('src/pages/', '').replace(/\.(ts|js|mjs|cjs)$/, '').replace(/\/index$/, ''));
  const routes = [...new Set([...text.matchAll(/"route"\s*:\s*"(\/api[^" ]*)"/g)].map(m => m[1]))];
  if (routes.some(p => !allowedRoutes.includes(p)) || allowedRoutes.some(p => !routes.includes(p))) throw new Error(`Inventario API del bundle inesperado: ${routes.join(', ')}`);
  for (const route of ['status-override', 'cron-check-links', 'analytics']) if (!text.includes(route)) throw new Error(`Ruta tombstone ausente del bundle: ${route}`);
  for (const marker of ['admin', 'Acceso administrativo']) if (!text.includes(marker)) throw new Error(`Ruta/UI admin ausente del bundle: ${marker}`);
  const client = resolve(bundleDir, config.assets?.directory || '../client');
  if (!existsSync(client) || files(client).some((p) => {
    let relative = p.slice(client.length).replaceAll('\\', '/');
    try { relative = decodeURIComponent(relative); } catch { return true; }
    return /^\/(?:api\/)?admin(?:[/.]|$)/i.test(relative);
  })) throw new Error('Asset admin estático detectado o directorio assets ausente');
}
console.log(`runtime boundary PASS (${scan.length} files${bundleIndex >= 0 ? ', bundle' : ''})`);

import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, rm, cp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
const root = process.cwd();
const gate = join(root, "scripts/admin/check-runtime-boundary.mjs");
async function fixtureBundle(dir: string) {
  await mkdir(join(dir, 'dist/server'), { recursive: true });
  await mkdir(join(dir, 'dist/client'), { recursive: true });
  const paths = await readdir(join(root, 'src/pages/api'), { recursive: true });
  const routes = paths.filter(p => /\.(ts|js)$/.test(p)).map(p => ({ route: '/api/' + p.replaceAll('\\', '/').replace(/\.(ts|js)$/, '').replace(/\/index$/, '') }));
  await writeFile(join(dir, 'dist/server/entry.mjs'), JSON.stringify(routes) + '\nadmin Acceso administrativo');
  await writeFile(join(dir, 'dist/server/wrangler.json'), JSON.stringify({ main: 'entry.mjs', assets: { directory: '../client' } }));
}
test("runtime boundary passes source inventory", async () => {
  const result = await run(process.execPath, [gate], { cwd: root });
  assert.match(result.stdout, /runtime boundary PASS/);
});
test("runtime boundary rejects executable Pages Functions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vet-gate-"));
  try {
    await mkdir(join(dir, "functions/api"), { recursive: true });
    await writeFile(join(dir, "functions/api/bad.mjs"), "export default {};");
    await assert.rejects(run(process.execPath, [gate], { cwd: dir }), (error: any) => /Handlers legacy/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("runtime boundary rejects incomplete bundle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vet-gate-"));
  try {
    await writeFile(join(dir, "entry.mjs"), "status-override");
    await assert.rejects(run(process.execPath, [gate, "--bundle", dir], { cwd: root }), (error: any) => /Configuración del bundle ausente/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("runtime boundary rejects new ALL API route", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vet-gate-"));
  try {
    await mkdir(join(dir, "src/pages/api"), { recursive: true });
    await writeFile(join(dir, "src/pages/api/new.ts"), "export const ALL = () => new Response('x');");
    await assert.rejects(run(process.execPath, [gate], { cwd: dir }), (error: any) => /Inventario API/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("runtime boundary rejects Pages deploy script", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vet-gate-"));
  try {
    await cp(join(root, 'src/pages/api'), join(dir, 'src/pages/api'), { recursive: true });
    await mkdir(join(dir, "scripts"), { recursive: true });
    await writeFile(join(dir, "scripts/deploy.mjs"), "wrangler pages deploy dist");
    await assert.rejects(run(process.execPath, [gate], { cwd: dir }), (error: any) => /Configuración de Pages\/Functions/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("runtime boundary rejects static admin asset", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vet-gate-"));
  try {
    await fixtureBundle(dir);
    await mkdir(join(dir, "dist/client/admin"), { recursive: true });
    await writeFile(join(dir, "dist/client/admin/index.html"), "x");
    await assert.rejects(run(process.execPath, [gate, "--bundle", join(dir, "dist/server")], { cwd: dir }), (error: any) => /Asset admin/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runtime boundary rejects an extra API in the generated manifest', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vet-gate-'));
  try {
    await fixtureBundle(dir);
    await writeFile(join(dir, 'dist/server/extra.mjs'), '{"route":"/api/legacy-write"}');
    await assert.rejects(run(process.execPath, [gate, '--bundle', join(dir, 'dist/server')], { cwd: dir }), (error: any) => /Inventario API del bundle/.test(error.stderr));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

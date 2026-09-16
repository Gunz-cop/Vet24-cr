import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

// Real compiled product, ephemeral stores and test-only outbound JWKS fixture.
// No test flags, signing keys or bypass are included in the product bundle.
test('Worker compilado: Access, host, métodos, assets y retiro legacy', async () => {
  const build = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
  const issuer = 'https://test-access.cloudflareaccess.com';
  const now = Math.floor(Date.now() / 1000);
  const sign = (claims = {}, kid = 'fixture-key') => new SignJWT({ iss: issuer, aud: 'fixture-aud', sub: 'editor', nbf: now - 30, exp: now + 600, ...claims }).setProtectedHeader({ alg: 'RS256', kid }).sign(privateKey);
  const outbound = [];
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'admin-integration',
    modules: [build.main, ...readdirSync('dist/server', { recursive: true }).filter(path => path.endsWith('.mjs') && path !== build.main)].map(path => ({ type: 'ESModule', path: resolve('dist/server', path) })),
    compatibilityDate: build.compatibility_date,
    compatibilityFlags: build.compatibility_flags,
    cf: false,
    bindings: { ADMIN_ORIGIN: 'https://vet24cr.com', ADMIN_ENABLED: 'true', ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: 'fixture-aud', ADMIN_SUBJECTS: 'editor' },
    assets: { directory: resolve('dist/client'), binding: 'ASSETS', run_worker_first: build.assets.run_worker_first, routerConfig: { has_user_worker: true } },
    d1Databases: ['DB'],
    kvNamespaces: ['SESSION'],
    outboundService: async request => {
      outbound.push(request.url);
      assert.equal(request.url, `${issuer}/cdn-cgi/access/certs`, 'No external operations permitted');
      return Response.json({ keys: [jwk] });
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    await db.exec('CREATE TABLE status_overrides (slug TEXT PRIMARY KEY, status TEXT); INSERT INTO status_overrides VALUES (\'sentinel\', \'unchanged\');');
    const before = await db.prepare('SELECT * FROM status_overrides').all();
    const token = await sign();
    const fetch = (path, method = 'GET', jwt, host = 'https://vet24cr.com') => mf.dispatchFetch(`${host}${path}`, { method, redirect: 'manual', headers: jwt ? { 'Cf-Access-Jwt-Assertion': jwt } : {} });
    const check = async (response, status, method = 'GET') => {
      assert.equal(response.status, status, response.status === status ? undefined : `${response.url}: ${await response.text()}`);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(response.headers.get('location'), null);
      if (method === 'HEAD') assert.equal(await response.text(), '');
    };
    for (const path of ['/admin', '/admin/', '/admin/index.html', '/admin/nueva/', '/api/admin', '/api/admin/clinics/', '/admin/accidental.html']) {
      for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS']) {
        await check(await fetch(path, method), 401, method);
        await check(await fetch(path, method, token, 'https://preview.workers.dev'), 403, method);
      }
    }
    for (const claims of [{ aud: 'wrong' }, { iss: 'https://evil.example' }, { exp: now - 1 }, { nbf: now + 600 }, { sub: '' }]) {
      await check(await fetch('/api/admin/', 'GET', await sign(claims)), claims.sub === '' ? 403 : 401);
    }
    await check(await fetch('/api/admin/', 'GET', await sign({ sub: 'other' })), 403);
    await check(await fetch('/api/admin/', 'GET', await sign({}, 'unknown-key')), 401);
    await check(await fetch('/api/admin/', 'GET', token.slice(0, -12) + 'forged'), 401);
    for (const path of ['/admin/', '/admin/nueva/', '/admin/editar/hems-una-heredia/']) {
      await check(await fetch(path, 'GET', token), 200);
      await check(await fetch(path, 'HEAD', token), 200, 'HEAD');
      const rejected = await fetch(path, 'POST', token);
      await check(rejected, 405);
      assert.equal(rejected.headers.get('allow'), 'GET, HEAD');
    }
    for (const path of ['/admin%2Fsecret', '/%61dmin/', '/ADMIN/', '/api%2Fadmin/', '/api/ADMIN/']) {
      const response = await fetch(path, 'GET', token);
      assert.ok([400, 403, 404].includes(response.status), `${path}: ${response.status}`);
    }
    for (const suffix of ['', '/']) {
      for (const method of ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
        const legacy = await fetch(`/api/status-override${suffix}`, method);
        await check(legacy, ['GET', 'HEAD'].includes(method) ? 503 : 405, method);
        for (const name of ['analytics', 'cron-check-links']) await check(await fetch(`/api/${name}${suffix}`, method), 410, method);
      }
    }
    assert.deepEqual((await db.prepare('SELECT * FROM status_overrides').all()).results, before.results);
    assert.ok(outbound.length >= 1 && outbound.length <= 2, 'JWKS cache prevents repeated fetches');
  } finally { await mf.dispose(); }
});

test('middleware compilado rechaza llamadas directas que omiten el wrapper Worker', async () => {
  const modules = readdirSync('dist/server', { recursive: true }).filter(p => p.endsWith('.mjs')).map(p => ({ type: 'ESModule', path: resolve('dist/server', p) }));
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'middleware-only', cf: false, compatibilityDate: '2026-06-09', compatibilityFlags: ['nodejs_compat'],
    bindings: { ADMIN_ORIGIN: 'https://vet24cr.com', ADMIN_ENABLED: 'true', ACCESS_TEAM_DOMAIN: 'https://unreachable.cloudflareaccess.com', ACCESS_AUD: 'fixture', ADMIN_SUBJECTS: 'editor' },
    modules: [{ type: 'ESModule', path: resolve('dist/server/middleware-fixture.mjs'), contents: `import { onRequest } from './virtual_astro_middleware.mjs'; export default { fetch(request) { return onRequest({request, locals: {}}, () => new Response('PRIVATE FIXTURE')); } };` }, ...modules],
    outboundService: () => { throw new Error('No network request permitted without a JWT'); },
  }));
  try {
    for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS']) for (const path of ['/admin/', '/api/admin/']) {
      const response = await mf.dispatchFetch(`https://vet24cr.com${path}`, { method, redirect: 'manual' });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.ok(!(await response.text()).includes('PRIVATE FIXTURE'));
    }
    const alternative = await mf.dispatchFetch('https://preview.workers.dev/admin/', { redirect: 'manual' });
    assert.equal(alternative.status, 403);
  } finally { await mf.dispose(); }
});

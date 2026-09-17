import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
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

test('contratos admin D1: replay, CAS de reportes, paginación y propuesta durable', async () => {
  const build = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'admin-contract-key', alg: 'RS256', use: 'sig' };
  const issuer = 'https://admin-contracts.cloudflareaccess.com';
  const now = Math.floor(Date.now() / 1000);
  const expectedCommit = 'a'.repeat(40);
  let expectedBlobSha = null;
  let githubBlobSha = null;
  const token = await new SignJWT({ iss: issuer, aud: 'admin-aud', sub: 'editor', nbf: now - 30, exp: now + 600 }).setProtectedHeader({ alg: 'RS256', kid: 'admin-contract-key' }).sign(privateKey);
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'admin-contracts', modules: [build.main, ...readdirSync('dist/server', { recursive: true }).filter(path => path.endsWith('.mjs') && path !== build.main)].map(path => ({ type: 'ESModule', path: resolve('dist/server', path) })),
    compatibilityDate: build.compatibility_date, compatibilityFlags: build.compatibility_flags, cf: false,
    bindings: { ADMIN_ORIGIN: 'https://vet24cr.com', ADMIN_ENABLED: 'true', ADMIN_BASE_COMMIT: expectedCommit, GITHUB_API_URL: 'https://api.github.test', GITHUB_REPOSITORY: 'org/repo', GITHUB_TOKEN: 'fixture-token', ACCESS_TEAM_DOMAIN: issuer, ACCESS_AUD: 'admin-aud', ADMIN_SUBJECTS: 'editor' },
    assets: { directory: resolve('dist/client'), binding: 'ASSETS', run_worker_first: build.assets.run_worker_first, routerConfig: { has_user_worker: true } },
    d1Databases: ['DB'], kvNamespaces: ['SESSION'],
    outboundService: async request => {
      if (request.url === `${issuer}/cdn-cgi/access/certs`) return Response.json({ keys: [jwk] });
      if (request.url.includes('/commits/')) return Response.json({ sha: expectedCommit });
      if (request.url.includes('/contents/src/content/clinicas/')) return Response.json({ sha: githubBlobSha });
      throw new Error(`Unexpected outbound request: ${request.url}`);
    },
  }));
  try {
    const db = await mf.getD1Database('DB');
    const migration = readFileSync('migrations/0001_admin_panel.sql', 'utf8').replace(/^--.*$/gm, '');
    for (const statement of migration.split(';').map(sql => sql.trim()).filter(Boolean)) await db.prepare(statement).run();
    const headers = { 'Cf-Access-Jwt-Assertion': token, Origin: 'https://vet24cr.com' };
    const fetch = (path, init = {}) => mf.dispatchFetch(`https://vet24cr.com${path}`, { redirect: 'manual', ...init, headers: { ...headers, ...(init.headers || {}) } });
    const catalogResponse = await fetch('/api/admin/clinics/?limit=1');
    assert.equal(catalogResponse.status, 200);
    const blankFilters = await fetch('/api/admin/clinics/?q=&provincia=&estado=&issue=&verification=&alerts=&reports=&limit=1');
    assert.equal(blankFilters.status, 200, await blankFilters.text());
    const catalog = await catalogResponse.json();
    assert.equal(catalog.counts.totalFiltered > 0, true);
    const slug = catalog.items[0].slug;
    const detailResponse = await fetch(`/api/admin/clinics/${slug}/`);
    assert.equal(detailResponse.status, 200);
    const detail = await detailResponse.json();
    const rawClinic = readFileSync(`src/content/clinicas/${slug}.md`);
    expectedBlobSha = createHash('sha1').update(`blob ${rawClinic.byteLength}\0`).update(rawClinic).digest('hex');
    githubBlobSha = expectedBlobSha;
    assert.equal(detail.blobSha, expectedBlobSha);

    const overrideKey = crypto.randomUUID();
    const overrideBody = { expectedRevision: 0, temporarilyClosed: false, message: '', schedule: null, expiresAt: null };
    const override = await fetch(`/api/admin/overrides/${slug}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': overrideKey }, body: JSON.stringify(overrideBody) });
    assert.equal(override.status, 200, await override.text());
    const replay = await fetch(`/api/admin/overrides/${slug}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': overrideKey }, body: JSON.stringify(overrideBody) });
    assert.equal(replay.status, 200);
    assert.equal(replay.headers.get('Idempotency-Replayed'), 'true');
    const payloadConflict = await fetch(`/api/admin/overrides/${slug}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': overrideKey }, body: JSON.stringify({ ...overrideBody, message: 'otro payload' }) });
    assert.equal(payloadConflict.status, 409);

    const schedule = { version: 1, timeZone: 'America/Costa_Rica', days: Array.from({ length: 7 }, () => ({ kind: 'closed' })), exceptions: [] };
    const activeOverride = await fetch(`/api/admin/overrides/${slug}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ expectedRevision: 1, temporarilyClosed: true, message: 'Cierre de prueba', schedule, expiresAt: new Date(Date.now() + 86400000).toISOString() }) });
    assert.equal(activeOverride.status, 200, await activeOverride.text());
    const publicOverride = await fetch(`/api/status-override?slug=${slug}`);
    assert.equal(publicOverride.status, 200);
    const publicPayload = await publicOverride.json();
    assert.equal(publicPayload.override.override_schedule_text, 'Domingo cerrado | Lunes cerrado | Martes cerrado | Miércoles cerrado | Jueves cerrado | Viernes cerrado | Sábado cerrado');
    assert.notEqual(publicPayload.override.override_schedule_text, '[object Object]');
    const messageOnly = await fetch(`/api/admin/overrides/${slug}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ expectedRevision: 2, temporarilyClosed: false, message: 'Horario especial por mantenimiento', schedule: null, expiresAt: null }) });
    assert.equal(messageOnly.status, 200, await messageOnly.text());
    const publicMessage = await (await fetch(`/api/status-override?slug=${slug}`)).json();
    assert.equal(publicMessage.override.override_status_text, 'Horario especial por mantenimiento');

    await db.prepare("INSERT INTO reports (clinic_slug, clinic_name, reason, description, contact) VALUES (?, ?, ?, ?, ?)").bind(slug, detail.clinic.nombre, 'datos', 'Fixture D1', '8888-8888').run();
    const reportsResponse = await fetch(`/api/admin/reports/?slug=${slug}&limit=1`);
    assert.equal(reportsResponse.status, 200);
    const reports = await reportsResponse.json();
    assert.equal(reports.items.length, 1);
    const report = reports.items[0];
    const reportKey = crypto.randomUUID();
    const reportBody = { expectedRevision: report.revision, status: 'reviewed', resolutionNote: 'Revisado en fixture' };
    const patched = await fetch(`/api/admin/reports/${report.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': reportKey }, body: JSON.stringify(reportBody) });
    assert.equal(patched.status, 200);
    const reportReplay = await fetch(`/api/admin/reports/${report.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': reportKey }, body: JSON.stringify(reportBody) });
    assert.equal(reportReplay.status, 200);
    assert.equal(reportReplay.headers.get('Idempotency-Replayed'), 'true');
    const staleKey = crypto.randomUUID();
    const stale = await fetch(`/api/admin/reports/${report.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': staleKey }, body: JSON.stringify(reportBody) });
    assert.equal(stale.status, 409);
    const staleReplay = await fetch(`/api/admin/reports/${report.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': staleKey }, body: JSON.stringify(reportBody) });
    assert.equal(staleReplay.status, 409);
    assert.equal(staleReplay.headers.get('Idempotency-Replayed'), 'true');

    const proposalKey = crypto.randomUUID();
    const proposal = await fetch('/api/admin/clinic-proposals/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': proposalKey }, body: JSON.stringify({ slug, newClinic: false, baseCommit: detail.baseCommit, blobSha: detail.blobSha, clinic: detail.clinic, evidence: { schemaVersion: 1, slug, observedAt: new Date().toISOString(), fuentes: [{ url: 'https://example.com/ficha', tipo: 'publica' }], facts: [{ field: 'direccion', value: detail.clinic.direccion, references: [0], confidence: 'medium' }], conflicts: [] } }) });
    assert.equal(proposal.status, 202);
    const partialProposal = await fetch('/api/admin/clinic-proposals/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ slug, newClinic: false, baseCommit: detail.baseCommit, blobSha: detail.blobSha, clinic: { direccion: detail.clinic.direccion }, evidence: { schemaVersion: 1, slug, observedAt: new Date().toISOString(), fuentes: [{ url: 'https://example.com/ficha', tipo: 'publica' }], facts: [{ field: 'direccion', value: detail.clinic.direccion, references: [0], confidence: 'medium' }], conflicts: [] } }) });
    assert.equal(partialProposal.status, 202, await partialProposal.text());
    const closedSchedule = { version: 1, timeZone: 'America/Costa_Rica', days: Array.from({ length: 7 }, () => ({ kind: 'closed' })), exceptions: [] };
    const scheduleProposal = await fetch('/api/admin/clinic-proposals/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ slug, newClinic: false, baseCommit: detail.baseCommit, blobSha: detail.blobSha, clinic: { schedule_v1: closedSchedule }, evidence: { schemaVersion: 1, slug, observedAt: new Date().toISOString(), fuentes: [{ url: 'https://example.com/ficha', tipo: 'publica' }], facts: [{ field: 'horario', value: 'cerrado', references: [0], confidence: 'medium' }], conflicts: [] } }) });
    const scheduleResult = await scheduleProposal.json();
    assert.equal(scheduleProposal.status, 202, JSON.stringify(scheduleResult));
    const storedProposal = JSON.parse((await db.prepare("SELECT payload_json FROM clinic_proposals WHERE operation_id = ?").bind(scheduleResult.operationId).first()).payload_json);
    assert.match(storedProposal.clinic.horarioTexto, /Domingo cerrado/);
    assert.equal(storedProposal.clinic.categoriaHorario, 'Horario normal');
    githubBlobSha = 'b'.repeat(40);
    const remoteConflict = await fetch('/api/admin/clinic-proposals/', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Vet24-Admin': '1', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ slug, newClinic: false, baseCommit: detail.baseCommit, blobSha: detail.blobSha, clinic: detail.clinic, evidence: { schemaVersion: 1, slug, observedAt: new Date().toISOString(), fuentes: [{ url: 'https://example.com/ficha', tipo: 'publica' }], facts: [{ field: 'direccion', value: detail.clinic.direccion, references: [0], confidence: 'medium' }], conflicts: [] } }) });
    assert.equal(remoteConflict.status, 409);
  } finally { await mf.dispose(); }
});

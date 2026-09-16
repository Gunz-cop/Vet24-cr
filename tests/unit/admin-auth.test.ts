import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { authenticate, guardAdmin, enforceMutation, adminPath, adminResponse, protectResponse } from '../../src/lib/admin/auth.ts';

const config = { ADMIN_ORIGIN: 'https://vet24cr.com', ADMIN_ENABLED: 'true', ACCESS_TEAM_DOMAIN: 'https://unit.cloudflareaccess.com', ACCESS_AUD: 'aud', ADMIN_SUBJECTS: 'editor' };
const req = (path = '/api/admin/', method = 'GET', token?: string) => new Request(`https://vet24cr.com${path}`, { method, headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {} });

test('host y configuración fallan cerrado antes de JWT; respuestas protegidas', async () => {
  assert.equal((await authenticate(new Request('https://preview.workers.dev/admin/'), {})).response?.status, 403);
  for (const field of Object.keys(config)) assert.equal((await authenticate(req(), { ...config, [field]: '' })).response?.status, 503, field);
  for (const domain of ['http://team.example', 'https://team.example/path', 'invalid', 'https://user:pass@team.example']) assert.equal((await authenticate(req(), { ...config, ACCESS_TEAM_DOMAIN: domain })).response?.status, 503);
  assert.equal((await authenticate(req(), config)).response?.status, 401);
  const response = adminResponse(401, req('/admin/', 'POST'), 'UNAUTHORIZED');
  assert.match(response.headers.get('content-type')!, /application\/json/);
  assert.equal((await response.json() as { error: string }).error, 'UNAUTHORIZED');
  const head = protectResponse(req('/admin/', 'HEAD'), new Response('private'));
  assert.equal(await head.text(), '');
  assert.equal(head.headers.get('cache-control'), 'private, no-store');
  assert.equal(head.headers.get('x-robots-tag'), 'noindex, nofollow');
});

test('RS256 real: firma, claims obligatorios, allowlist y caché JWKS sin bypass', async t => {
  const { privateKey, publicKey } = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(publicKey), kid: 'key', alg: 'RS256' };
  let fetches = 0;
  t.mock.method(globalThis, 'fetch', async (url: string | URL) => {
    assert.equal(String(url), `${config.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`);
    fetches++;
    return Response.json({ keys: [jwk] });
  });
  const now = Math.floor(Date.now() / 1000);
  const claims: Record<string, unknown> = { iss: config.ACCESS_TEAM_DOMAIN, aud: 'aud', sub: 'editor', nbf: now - 1, exp: now + 600 };
  const sign = (payload: Record<string, unknown>, kid = 'key') => new SignJWT(payload).setProtectedHeader({ alg: 'RS256', kid }).sign(privateKey);
  const token = await sign(claims);
  assert.equal((await authenticate(req('/api/admin/', 'GET', token), config)).identity?.sub, 'editor');
  for (const key of ['iss', 'aud', 'sub', 'nbf', 'exp']) {
    const payload = { ...claims }; delete payload[key];
    assert.equal((await authenticate(req('/api/admin/', 'GET', await sign(payload)), config)).response?.status, 401, key);
  }
  for (const extra of [{ iss: 'wrong' }, { aud: 'wrong' }, { exp: now - 30 }, { nbf: now + 600 }]) assert.equal((await authenticate(req('/api/admin/', 'GET', await sign({ ...claims, ...extra })), config)).response?.status, 401);
  assert.equal((await authenticate(req('/api/admin/', 'GET', await sign({ ...claims, sub: 'stranger' })), config)).response?.status, 403);
  assert.equal((await authenticate(req('/api/admin/', 'GET', await sign(claims, 'unknown')), config)).response?.status, 401);
  assert.equal((await authenticate(req('/api/admin/', 'GET', token.slice(0, -8) + 'forgery'), config)).response?.status, 401);
  const hmac = await new SignJWT(claims).setProtectedHeader({ alg: 'HS256' }).sign(new Uint8Array(32));
  assert.equal((await authenticate(req('/api/admin/', 'GET', hmac), config)).response?.status, 401);
  assert.equal(fetches, 1);
});

test('frontera compartida: rutas ambiguas, métodos y reutilización interna por request', async () => {
  for (const path of ['/admin', '/admin/', '/api/admin/x', '/admin/index.html']) assert.equal(adminPath(path).protected, true);
  for (const path of ['/%61dmin/', '/admin%2fsecret', '/ADMIN/', '/api/ADMIN/', '/%2561dmin/']) {
    assert.equal(adminPath(path).protected, true);
    assert.equal((await guardAdmin(req(path), config, { sub: 'editor' })).response?.status, 400);
  }
  assert.equal(adminPath('/clinica/admin/').protected, false);
  assert.equal((await guardAdmin(req('/admin/'), config, { sub: 'editor' })).identity?.sub, 'editor');
  for (const method of ['POST', 'OPTIONS', 'DELETE']) {
    const response = (await guardAdmin(req('/admin/', method), config, { sub: 'editor' })).response!;
    assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'GET, HEAD');
  }
  assert.equal((await guardAdmin(req('/api/admin/', 'OPTIONS'), config, { sub: 'editor' })).response?.status, 405);
  assert.equal((await guardAdmin(req('/api/admin/', 'POST'), config, { sub: 'editor' })).response?.status, 403);
});

test('mutaciones: CSRF, JSON exacto, límite real incremental y failclosed', async () => {
  const headers = { Origin: config.ADMIN_ORIGIN, 'X-Vet24-Admin': '1', 'Content-Type': 'application/json' };
  const request = (body = '{}', extra: Record<string, string> = {}) => new Request(`${config.ADMIN_ORIGIN}/api/admin/x`, { method: 'POST', headers: { ...headers, ...extra }, body });
  for (const extra of [{ Origin: '' }, { 'X-Vet24-Admin': '' }, { 'Sec-Fetch-Site': 'cross-site' }] as Record<string, string>[]) assert.equal((await enforceMutation(request('{}', extra), config.ADMIN_ORIGIN))?.status, 403);
  assert.equal((await enforceMutation(request('{}', { 'Content-Type': 'application/jsonp' }), config.ADMIN_ORIGIN))?.status, 415);
  assert.equal((await enforceMutation(request('{'), config.ADMIN_ORIGIN))?.status, 422);
  assert.equal(await enforceMutation(request('"' + 'x'.repeat(65534) + '"'), config.ADMIN_ORIGIN), undefined);
  assert.equal((await enforceMutation(request('"' + 'x'.repeat(65535) + '"'), config.ADMIN_ORIGIN))?.status, 413);
  let cancelled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(16384)); }, cancel() { cancelled = true; } });
  const streamed = new Request(`${config.ADMIN_ORIGIN}/api/admin/x`, { method: 'POST', headers, body: stream, duplex: 'half' } as RequestInit);
  assert.equal((await enforceMutation(streamed, config.ADMIN_ORIGIN))?.status, 413);
  assert.equal(cancelled, true);
  assert.equal((await guardAdmin(request(), config, { sub: 'editor' })).response?.status, 503);
});

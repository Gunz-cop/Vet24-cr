import { createRemoteJWKSet, jwtVerify } from 'jose';

export type AdminIdentity = { sub: string; email?: string };
export type AdminConfig = {
  ADMIN_ORIGIN?: string; ADMIN_ENABLED?: string | boolean; ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string; ADMIN_SUBJECTS?: string;
};
const MAX_BODY = 64 * 1024;
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
export function validIdempotencyKey(value: string | null) { return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value); }

export function adminPath(pathname: string) {
  let decoded = pathname;
  // Decode only to detect and reject alternate spellings; never route to them.
  for (let i = 0; i < 3; i++) {
    try { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; }
    catch { break; }
  }
  const normalized = decoded.replace(/\\/g, '/').replace(/\/{2,}/g, '/').toLowerCase();
  const ui = normalized === '/admin' || normalized.startsWith('/admin/');
  const api = normalized === '/api/admin' || normalized.startsWith('/api/admin/');
  return { protected: ui || api, ui, ambiguous: pathname !== normalized || /%|\\/.test(pathname) };
}
export const isAdminPath = (pathname: string) => adminPath(pathname).protected;
export const isProtectedFamily = isAdminPath;

export function protectResponse(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'private, no-store');
  headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, statusText: response.statusText, headers });
}
export function adminResponse(status: number, request: Request, error: string): Response {
  const ui = ['GET', 'HEAD'].includes(request.method) && adminPath(new URL(request.url).pathname).ui;
  const requestId = crypto.randomUUID();
  const body = ui ? '<!doctype html><html lang="es"><head><title>Acceso administrativo</title></head><body><h1>Acceso denegado</h1><p>La sesión administrativa no está disponible.</p></body></html>' : JSON.stringify({ success: false, error, requestId });
  return protectResponse(request, new Response(body, { status, headers: { 'Content-Type': ui ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'X-Request-Id': requestId } }));
}

function configuration(request: Request, env: AdminConfig) {
  const origin = env.ADMIN_ORIGIN || 'https://vet24cr.com';
  if (new URL(request.url).origin !== origin) return { response: adminResponse(403, request, 'FORBIDDEN') };
  const domain = (env.ACCESS_TEAM_DOMAIN || '').replace(/\/$/, '');
  const aud = (env.ACCESS_AUD || '').trim();
  const subjects = (env.ADMIN_SUBJECTS || '').split(',').map(s => s.trim()).filter(Boolean);
  let validDomain = false;
  try { const url = new URL(domain); validDomain = url.protocol === 'https:' && url.origin === domain && !url.username && !url.password; } catch { /* unavailable */ }
  if (!env.ADMIN_ORIGIN || !(env.ADMIN_ENABLED === true || env.ADMIN_ENABLED === 'true') || !validDomain || !aud || !subjects.length) return { response: adminResponse(503, request, 'ADMIN_UNAVAILABLE') };
  return { origin, domain, aud, subjects };
}
function getJwks(domain: string) {
  let keys = jwksCache.get(domain);
  if (!keys) {
    if (jwksCache.size >= 4) jwksCache.delete(jwksCache.keys().next().value!);
    keys = createRemoteJWKSet(new URL(`${domain}/cdn-cgi/access/certs`), { cooldownDuration: 30_000, cacheMaxAge: 300_000, timeoutDuration: 3_000 });
    jwksCache.set(domain, keys);
  }
  return keys;
}
function isAllowedSubject(subjects: string[], identity: AdminIdentity) {
  return subjects.includes(identity.sub) || (!!identity.email && subjects.includes(identity.email));
}
export async function authenticate(request: Request, env: AdminConfig, identity?: AdminIdentity): Promise<{ identity?: AdminIdentity; response?: Response }> {
  const config = configuration(request, env);
  if (config.response) return { response: config.response };
  if (identity) return isAllowedSubject(config.subjects!, identity) ? { identity } : { response: adminResponse(403, request, 'FORBIDDEN') };
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return { response: adminResponse(401, request, 'UNAUTHORIZED') };
  try {
    const { payload } = await jwtVerify(token, getJwks(config.domain!), { algorithms: ['RS256'], issuer: config.domain, audience: config.aud, requiredClaims: ['iss', 'aud', 'exp', 'nbf', 'sub'] });
    const sub = payload.sub;
    const email = typeof payload.email === 'string' ? payload.email : undefined;
    if (typeof sub !== 'string' || !isAllowedSubject(config.subjects!, { sub, email })) return { response: adminResponse(403, request, 'FORBIDDEN') };
    return { identity: { sub, email } };
  } catch { return { response: adminResponse(401, request, 'UNAUTHORIZED') }; }
}
export function methodResponse(request: Request, allowed: string): Response | undefined {
  if (!allowed.split(',').map(s => s.trim()).includes(request.method)) {
    const response = adminResponse(405, request, 'METHOD_NOT_ALLOWED');
    response.headers.set('Allow', allowed);
    return response;
  }
}
export async function enforceMutation(request: Request, origin: string): Promise<Response | undefined> {
  const method = methodResponse(request, 'POST, PUT, PATCH, DELETE');
  if (method) return method;
  if (request.headers.get('Origin') !== origin || request.headers.get('X-Vet24-Admin') !== '1') return adminResponse(403, request, 'FORBIDDEN');
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin') return adminResponse(403, request, 'FORBIDDEN');
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return adminResponse(415, request, 'UNSUPPORTED_MEDIA_TYPE');
  const length = request.headers.get('Content-Length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return adminResponse(413, request, 'PAYLOAD_TOO_LARGE');
  // Current I04 writes terminate here. Read the original stream with a hard bound;
  // cloning would tee and buffer an unbounded second copy. I05 must pass this
  // validated payload to its handler when introducing durable writes.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY) { await reader.cancel(); return adminResponse(413, request, 'PAYLOAD_TOO_LARGE'); }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
  } catch { return adminResponse(422, request, 'INVALID_BODY'); }
  finally { reader?.releaseLock(); }
}

/** Shared Worker/middleware boundary. Identity is internal, request-scoped context. */
export async function guardAdmin(request: Request, env: AdminConfig, identity?: AdminIdentity) {
  const auth = await authenticate(request, env, identity);
  if (auth.response) return auth;
  const path = adminPath(new URL(request.url).pathname);
  if (path.ambiguous) return { response: adminResponse(400, request, 'INVALID_PATH') };
  const method = methodResponse(request, path.ui ? 'GET, HEAD' : 'GET, HEAD, POST, PUT, PATCH, DELETE');
  if (method) return { response: method };
  // Validate a tee'd request so the authenticated route still receives the
  // original body. The validator owns the clone and applies the hard limit.
  if (!['GET', 'HEAD'].includes(request.method)) {
    const mutationResponse = await enforceMutation(request.clone() as unknown as Request, env.ADMIN_ORIGIN!);
    if (mutationResponse) return { response: mutationResponse };
  }
  return auth;
}

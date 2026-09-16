import officialHandler from "@astrojs/cloudflare/entrypoints/server";
import { handleAgentRequest } from "./lib/agent-http.ts";
import { guardAdmin, isProtectedFamily, protectResponse } from "./lib/admin/auth.ts";
import { handleStatusOverride } from './pages/api/status-override';
import { handleAnalytics } from './pages/api/analytics';
import { handleCronCheckLinks } from './pages/api/cron-check-links';

const worker = {
  async fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    // Dispatch the single endpoint implementations before Astro's slash redirects.
    const path = new URL(request.url).pathname.replace(/\/$/, '');
    if (path === '/api/status-override') return handleStatusOverride(request);
    if (path === '/api/analytics') return handleAnalytics(request);
    if (path === '/api/cron-check-links') return handleCronCheckLinks(request);
    if (isProtectedFamily(new URL(request.url).pathname)) {
      const auth = await guardAdmin(request, env);
      if (auth.response) return auth.response;
      const props = { ...(context.props as Record<string, unknown>), adminIdentity: auth.identity };
      const scopedContext = new Proxy(context, { get(target, key) {
        if (key === 'props') return props;
        const value = Reflect.get(target, key, target);
        return typeof value === 'function' ? value.bind(target) : value;
      } });
      return protectResponse(request, await officialHandler.fetch(request, env, scopedContext));
    }
    return handleAgentRequest(request, env, context, (delegatedRequest, delegatedEnv, delegatedContext) =>
      officialHandler.fetch(delegatedRequest, delegatedEnv, delegatedContext),
    );
  },
};

export default worker;

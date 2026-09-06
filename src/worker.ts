import officialHandler from "@astrojs/cloudflare/entrypoints/server";
import { handleAgentRequest } from "./lib/agent-http.ts";

const worker = {
  fetch(request: Request, env: Env, context: ExecutionContext): Promise<Response> {
    return handleAgentRequest(request, env, context, (delegatedRequest, delegatedEnv, delegatedContext) =>
      officialHandler.fetch(delegatedRequest, delegatedEnv, delegatedContext),
    );
  },
};

export default worker;

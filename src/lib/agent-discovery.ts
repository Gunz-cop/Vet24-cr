export const AGENT_LINK_HEADER = '</.well-known/api-catalog>; rel="api-catalog", </api/openapi.json>; rel="service-desc", </api/readme.md>; rel="service-doc", </llms.txt>; rel="describedby"';

export function isAgentDiscoverableHtmlPath(pathname: string): boolean {
  return pathname === "/" || /^\/(clinica|provincia|zona)\//.test(pathname);
}

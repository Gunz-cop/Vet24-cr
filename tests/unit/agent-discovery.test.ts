import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_LINK_HEADER, isAgentDiscoverableHtmlPath } from "../../src/lib/agent-discovery.ts";

test("expone las cuatro relaciones exactas en HTML de descubrimiento", () => {
  assert.equal(
    AGENT_LINK_HEADER,
    '</.well-known/api-catalog>; rel="api-catalog", </api/openapi.json>; rel="service-desc", </api/readme.md>; rel="service-doc", </llms.txt>; rel="describedby"',
  );
  for (const path of ["/", "/clinica/hems-una-heredia/", "/provincia/heredia/", "/zona/guapiles/"]) {
    assert.equal(isAgentDiscoverableHtmlPath(path), true);
  }
  for (const path of ["/api/catalog.json", "/auth.md", "/.well-known/api-catalog", "/acerca/"]) {
    assert.equal(isAgentDiscoverableHtmlPath(path), false);
  }
});

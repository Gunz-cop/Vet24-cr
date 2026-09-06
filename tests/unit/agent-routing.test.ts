import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleAgentRequest, selectRepresentation } from "../../src/lib/agent-http.ts";

const context = {} as ExecutionContext;

test("run_worker_first cubre solo las familias HTML contractuales", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  const wrangler = readFileSync(join(here, "../../wrangler.toml"), "utf8");
  const configured = wrangler.match(/run_worker_first\s*=\s*\[([^\]]*)\]/s)?.[1].match(/"[^"]+"/g)?.map((value) => value.slice(1, -1));
  assert.deepEqual(configured, ["/", "/clinica/*", "/provincia/*", "/zona/*"]);
  assert.equal(configured?.some((path) => path.startsWith("/api/")), false);
});

test("negocia Markdown solo con preferencia explícita y q válida", () => {
  const cases: Array<[string | null, "html" | "markdown"]> = [
    [null, "html"],
    ["", "html"],
    ["text/markdown", "markdown"],
    ["text/html, text/markdown", "html"],
    ["text/markdown;q=0", "html"],
    ["text/markdown;q=0.9, text/html;q=0.8", "markdown"],
    ["text/markdown;q=0.8, text/html;q=0.8", "html"],
    ["text/markdown;q=0.8, */*;q=0.7", "markdown"],
    ["*/*", "html"],
    ["text/*", "html"],
    ["text/html;q=0, text/markdown;q=0.4", "markdown"],
    ["application/json", "html"],
  ];
  for (const [accept, expected] of cases) assert.equal(selectRepresentation(accept), expected, accept ?? "missing");
});

test("añade Vary y no-store a HTML y Markdown sin borrar Vary existente", async () => {
  const delegate = async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/md/")) {
      return new Response("# espejo", { headers: { "Content-Type": "text/markdown", "X-Robots-Tag": "noindex", Vary: "Accept-Encoding" } });
    }
    return new Response("<html>canónico</html>", { headers: { "Content-Type": "text/html", Vary: "Accept-Encoding" } });
  };

  const markdown = await handleAgentRequest(new Request("https://vet24cr.com/clinica/demo/", { headers: { Accept: "text/markdown" } }), {}, context, delegate);
  assert.equal(markdown.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(markdown.headers.get("x-robots-tag"), null);
  assert.match(markdown.headers.get("vary") ?? "", /Accept-Encoding/);
  assert.match(markdown.headers.get("vary") ?? "", /Accept/);
  assert.equal(markdown.headers.get("cache-control"), "private, no-store");
  assert.equal(await markdown.text(), "# espejo");

  const html = await handleAgentRequest(new Request("https://vet24cr.com/clinica/demo/", { headers: { Accept: "text/html" } }), {}, context, delegate);
  assert.equal(await html.text(), "<html>canónico</html>");
  assert.equal(html.headers.get("cache-control"), "private, no-store");
  assert.match(html.headers.get("vary") ?? "", /Accept-Encoding/);
  assert.match(html.headers.get("vary") ?? "", /Accept/);
});

test("HEAD sigue la representación seleccionada sin cuerpo", async () => {
  let paths: string[] = [];
  const delegate = async (request: Request) => {
    paths.push(new URL(request.url).pathname);
    return new Response("body", { headers: { "Content-Type": "text/markdown", "X-Robots-Tag": "noindex" } });
  };
  const response = await handleAgentRequest(new Request("https://vet24cr.com/", { method: "HEAD", headers: { Accept: "text/markdown" } }), {}, context, delegate);
  assert.equal(await response.text(), "");
  assert.deepEqual(paths, ["/md/index.md"]);
  assert.equal(response.headers.get("x-robots-tag"), null);
});

test("mirror ausente o fallido conserva la respuesta oficial y su status", async () => {
  const requests: Request[] = [];
  const delegate = async (request: Request) => {
    requests.push(request);
    if (new URL(request.url).pathname.startsWith("/md/")) throw new Error("mirror unavailable");
    return new Response("HTML normal", { status: 418, headers: { "Content-Type": "text/html" } });
  };
  const response = await handleAgentRequest(new Request("https://vet24cr.com/", { headers: { Accept: "text/markdown" } }), {}, context, delegate);
  assert.equal(response.status, 418);
  assert.equal(await response.text(), "HTML normal");
  assert.deepEqual(requests.map((request) => new URL(request.url).pathname), ["/md/index.md", "/"]);
});

test("POST ajeno no se negocia ni se consume", async () => {
  let received: Request | undefined;
  const body = "reporte de prueba";
  const delegate = async (request: Request) => {
    received = request;
    return new Response("accepted", { status: 202 });
  };
  const request = new Request("https://vet24cr.com/", { method: "POST", body, headers: { Accept: "text/markdown" } });
  const response = await handleAgentRequest(request, {}, context, delegate);
  assert.equal(response.status, 202);
  assert.equal(received, request);
  assert.equal(await request.text(), body);
});

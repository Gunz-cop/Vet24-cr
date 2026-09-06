#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  expectedMirrorRoutes,
} from "../../src/lib/agent-markdown.ts";

const root = process.cwd();
const client = resolve(root, "dist/client");
const args = process.argv.slice(2);
const baseUrlIndex = args.indexOf("--base-url");
const baseUrl = baseUrlIndex >= 0 ? args[baseUrlIndex + 1] : null;
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
    return null;
  }
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await walk(path));
    else result.push(path);
  }
  return result;
}

function normalizeBase(value) {
  return new URL(value.endsWith("/") ? value : `${value}/`);
}

function header(response, name) {
  return response.headers.get(name) ?? "";
}

function assertNegotiationHeaders(response, label, markdown) {
  check(/(?:^|,\s*)accept(?:\s*,|$)/i.test(header(response, "vary")), `${label}: Vary no contiene Accept`);
  check(header(response, "cache-control").toLowerCase() === "private, no-store", `${label}: Cache-Control no es private, no-store`);
  if (markdown) {
    check(header(response, "content-type").toLowerCase().includes("text/markdown"), `${label}: no es Markdown`);
    check(!header(response, "x-robots-tag").toLowerCase().includes("noindex"), `${label}: heredó X-Robots-Tag noindex`);
  } else {
    check(header(response, "content-type").toLowerCase().includes("text/html"), `${label}: no conserva HTML`);
    check(!header(response, "x-robots-tag"), `${label}: HTML tiene X-Robots-Tag`);
  }
}

async function verifyBuild() {
  const catalog = await readJson(join(client, "api/catalog.json"), "catálogo AR2");
  if (!catalog) return null;
  check(catalog.schemaVersion === "1", "catálogo: schemaVersion inesperada");
  check(catalog.timeZone === "America/Costa_Rica", "catálogo: zona horaria inesperada");
  check(Array.isArray(catalog.clinics), "catálogo: clinics no es un array");
  check(new Set(catalog.clinics.map((clinic) => clinic.slug)).size === catalog.clinics.length, "catálogo: slugs duplicados");
  check(catalog.clinics.every((clinic) => clinic.openNow === null), "catálogo: hay openNow distinto de null");

  const expected = expectedMirrorRoutes(catalog);
  const expectedPaths = new Set(expected.map((route) => route.mirrorPath));
  const mirrorRoot = join(client, "md");
  let actualPaths = [];
  try {
    actualPaths = (await walk(mirrorRoot)).map((path) => `/${relative(client, path).replaceAll("\\", "/")}`);
  } catch (error) {
    failures.push(`inventario Markdown: ${error.message}`);
  }
  check(actualPaths.length === expectedPaths.size, `inventario Markdown: se esperaban ${expectedPaths.size} archivos y hay ${actualPaths.length}`);
  for (const path of expectedPaths) check(actualPaths.includes(path), `inventario Markdown: falta ${path}`);
  for (const path of actualPaths) check(expectedPaths.has(path), `inventario Markdown: ruta no contractual ${path}`);

  const sitemapFiles = (await walk(client)).filter((path) => /sitemap.*\.xml$/i.test(path));
  const sitemapText = (await Promise.all(sitemapFiles.map((path) => readFile(path, "utf8")))).join("\n");
  for (const path of expectedPaths) check(!sitemapText.includes(path), `sitemap: contiene mirror ${path}`);

  for (const route of expected) {
    const file = join(client, route.mirrorPath.replace(/^\//, ""));
    let content = "";
    try {
      content = await readFile(file, "utf8");
    } catch (error) {
      failures.push(`${route.mirrorPath}: ${error.message}`);
      continue;
    }
    check(content.length > 0, `${route.mirrorPath}: contenido vacío`);
    check(!/openNow\s*[:=]\s*true|abierta ahora|abiertas hoy/i.test(content), `${route.mirrorPath}: afirma disponibilidad en tiempo real`);
    if (route.kind === "clinic") {
      const clinic = catalog.clinics.find((item) => `/clinica/${item.slug}/` === route.htmlPath);
      check(Boolean(clinic), `${route.mirrorPath}: no corresponde a una ficha del catálogo`);
      if (clinic) {
        check(content.includes(clinic.bodyMarkdown), `${route.mirrorPath}: perdió bodyMarkdown`);
        for (const warning of clinic.advertencias) check(content.includes(warning), `${route.mirrorPath}: perdió advertencia`);
        check(content.includes(clinic.url), `${route.mirrorPath}: perdió URL canónica`);
      }
    }
  }

  const wrangler = await readFile(join(root, "wrangler.toml"), "utf8");
  const runWorkerFirst = wrangler.match(/run_worker_first\s*=\s*\[([^\]]*)\]/s);
  const configured = runWorkerFirst?.[1].match(/"[^"]+"/g)?.map((value) => value.slice(1, -1)) ?? [];
  const required = ["/", "/clinica/*", "/provincia/*", "/zona/*"];
  check(JSON.stringify(configured) === JSON.stringify(required), `wrangler: run_worker_first debe ser ${JSON.stringify(required)}, fue ${JSON.stringify(configured)}`);
  check(!configured.some((path) => path === "/api/*" || path.startsWith("/api/")), "wrangler: captura general de /api/");

  const agentSource = await Promise.all([
    readFile(join(root, "src/worker.ts"), "utf8"),
    readFile(join(root, "src/lib/agent-http.ts"), "utf8"),
  ]);
  check(!agentSource.some((source) => /\bcaches\s*\./i.test(source)), "AR3: se usa Cache API");
  return expected;
}

async function verifyHttp(routes) {
  const origin = normalizeBase(baseUrl);
  for (const route of routes) {
    const htmlUrl = new URL(route.htmlPath.slice(1), origin);
    const mirrorUrl = new URL(route.mirrorPath.slice(1), origin);
    const markdown = await fetch(htmlUrl, { headers: { Accept: "text/markdown" } });
    check(markdown.status === 200, `HTTP Markdown ${route.htmlPath}: status ${markdown.status}`);
    assertNegotiationHeaders(markdown, `HTTP Markdown ${route.htmlPath}`, true);

    const html = await fetch(htmlUrl, { headers: { Accept: "text/html, text/markdown;q=0" } });
    check(html.status === 200, `HTTP HTML ${route.htmlPath}: status ${html.status}`);
    assertNegotiationHeaders(html, `HTTP HTML ${route.htmlPath}`, false);

    const markdownHead = await fetch(htmlUrl, { method: "HEAD", headers: { Accept: "text/markdown" } });
    check(markdownHead.status === 200, `HTTP HEAD Markdown ${route.htmlPath}: status ${markdownHead.status}`);
    check((await markdownHead.text()) === "", `HTTP HEAD Markdown ${route.htmlPath}: tiene cuerpo`);
    assertNegotiationHeaders(markdownHead, `HTTP HEAD Markdown ${route.htmlPath}`, true);

    const htmlHead = await fetch(htmlUrl, { method: "HEAD", headers: { Accept: "text/html" } });
    check(htmlHead.status === 200, `HTTP HEAD HTML ${route.htmlPath}: status ${htmlHead.status}`);
    check((await htmlHead.text()) === "", `HTTP HEAD HTML ${route.htmlPath}: tiene cuerpo`);
    assertNegotiationHeaders(htmlHead, `HTTP HEAD HTML ${route.htmlPath}`, false);

    const direct = await fetch(mirrorUrl);
    check(direct.status === 200, `HTTP directo ${route.mirrorPath}: status ${direct.status}`);
    check(header(direct, "content-type").toLowerCase().includes("text/markdown"), `HTTP directo ${route.mirrorPath}: MIME incorrecto`);
    check(header(direct, "access-control-allow-origin") === "*", `HTTP directo ${route.mirrorPath}: falta CORS público`);
    check(header(direct, "x-robots-tag").toLowerCase().includes("noindex"), `HTTP directo ${route.mirrorPath}: falta noindex`);
  }
}

const routes = await verifyBuild();
if (baseUrl && routes) {
  try {
    await verifyHttp(routes);
  } catch (error) {
    failures.push(`HTTP ${baseUrl}: ${error.message}`);
  }
}

if (failures.length) {
  console.error(`agent-markdown: ${failures.length} fallo(s)`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`agent-markdown: OK (${routes?.length ?? 0} mirrors${baseUrl ? ` + HTTP ${baseUrl}` : ""})`);
}

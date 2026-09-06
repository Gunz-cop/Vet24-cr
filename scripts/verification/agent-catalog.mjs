import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const repo = resolve(import.meta.dirname, "../..");
const dist = join(repo, "dist");
const errors = [];

function walk(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

const files = walk(dist);
function findArtifact(pathname) {
  const normalized = pathname.replace(/^\//, "");
  const matches = files.filter((file) => {
    const builtPath = relative(dist, file).replaceAll("\\", "/");
    return builtPath === normalized || builtPath.endsWith(`/${normalized}`);
  });
  return matches[0];
}

function readArtifact(pathname, label = pathname) {
  const file = findArtifact(pathname);
  if (!file) {
    errors.push(`missing artifact: ${pathname}`);
    return null;
  }
  return readFileSync(file, "utf8");
}

const catalogText = readArtifact("api/catalog.json");
const openapiText = readArtifact("api/openapi.json");
const llmsText = readArtifact("llms.txt");
const readmeText = readArtifact("api/readme.md");
const authText = readArtifact("auth.md");
const linksetText = readArtifact(".well-known/api-catalog");

let catalog;
let openapi;
let linkset;
try { catalog = JSON.parse(catalogText); } catch { errors.push("catalog is not valid JSON"); }
try { openapi = JSON.parse(openapiText); } catch { errors.push("OpenAPI is not valid JSON"); }
try { linkset = JSON.parse(linksetText); } catch { errors.push("API Catalog is not valid JSON"); }

if (catalog) {
  if (catalog.schemaVersion !== "1") errors.push("catalog schemaVersion must be 1");
  if (catalog.timeZone !== "America/Costa_Rica") errors.push("catalog timeZone mismatch");
  if (!Array.isArray(catalog.clinics)) errors.push("catalog clinics must be an array");
  const clinics = Array.isArray(catalog.clinics) ? catalog.clinics : [];
  const slugs = clinics.map((clinic) => clinic.slug);
  if (new Set(slugs).size !== slugs.length) errors.push("catalog slugs are not unique");
  for (const clinic of clinics) {
    if (!clinic.url || clinic.url !== `https://vet24cr.com/clinica/${clinic.slug}/`) errors.push(`bad URL for ${clinic.slug}`);
    if (clinic.openNow !== null) errors.push(`openNow is not null for ${clinic.slug}`);
    if (!Array.isArray(clinic.verification_notes)) errors.push(`verification_notes missing for ${clinic.slug}`);
    if (!Array.isArray(clinic.advertencias) || clinic.advertencias.length !== 3) errors.push(`warnings missing for ${clinic.slug}`);
    if (!clinic.capacidades || typeof clinic.capacidades !== "object") errors.push(`capacidades missing for ${clinic.slug}`);
  }
}

if (openapi) {
  if (openapi.openapi !== "3.1.0") errors.push("OpenAPI must be 3.1.0");
  if (Object.keys(openapi.paths ?? {}).join() !== "/api/catalog.json") errors.push("OpenAPI describes an unexpected path");
  const operation = openapi.paths?.["/api/catalog.json"]?.get;
  if (!operation || operation.post || operation.parameters || operation.security) errors.push("OpenAPI catalog operation is not read-only and unfiltered");
  if (!openapi.components?.schemas?.Catalog) errors.push("OpenAPI catalog schema missing");
}

if (linkset) {
  if (linkset.anchor !== "https://vet24cr.com/api/catalog.json") errors.push("API Catalog anchor mismatch");
  const desc = linkset["service-desc"]?.map((item) => item.href) ?? [];
  const docs = linkset["service-doc"]?.map((item) => item.href) ?? [];
  if (desc.length !== 1 || desc[0] !== "https://vet24cr.com/api/openapi.json") errors.push("API Catalog service-desc mismatch");
  if (docs.length !== 1 || docs[0] !== "https://vet24cr.com/api/readme.md") errors.push("API Catalog service-doc mismatch");
  if (Object.keys(linkset).some((key) => !["anchor", "service-desc", "service-doc"].includes(key))) errors.push("API Catalog contains unexpected relation");
}

if (llmsText && (!llmsText.startsWith("# Vet24-cr") || !llmsText.includes("/api/catalog.json") || !llmsText.includes("/api/readme.md"))) errors.push("llms.txt is missing required discovery links");
if (readmeText && (!readmeText.startsWith("# API pública") || !readmeText.includes("Emergencias registradas en Heredia") || !readmeText.includes("`openNow`"))) errors.push("api/readme.md is missing the contract examples/limits");
if (authText && !authText.startsWith("# auth.md")) errors.push("auth.md heading missing");

const clinicHtml = files.filter((file) => /(?:^|[\\/])clinica[\\/][^\\/]+[\\/]index\.html$/.test(file));
const htmlSlugs = clinicHtml.map((file) => relative(dist, file).replaceAll("\\", "/").match(/clinica\/([^/]+)\/index\.html$/)?.[1]).filter(Boolean);
const catalogSlugs = catalog?.clinics?.map((clinic) => clinic.slug) ?? [];
if (new Set(htmlSlugs).size !== new Set(catalogSlugs).size || [...new Set(htmlSlugs)].some((slug) => !catalogSlugs.includes(slug)) || [...new Set(catalogSlugs)].some((slug) => !htmlSlugs.includes(slug))) {
  errors.push("catalog clinic set differs from built clinic HTML routes");
}
for (const file of clinicHtml) {
  const slug = relative(dist, file).replaceAll("\\", "/").match(/clinica\/([^/]+)\/index\.html$/)?.[1];
  if (slug && !readFileSync(file, "utf8").includes(`https://vet24cr.com/clinica/${slug}/`)) errors.push(`canonical URL missing in HTML for ${slug}`);
}

if (errors.length) {
  console.error(errors.map((error) => `✗ ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`✓ AR2 catalog artifacts valid (${catalog.clinics.length} clinics, ${clinicHtml.length} HTML routes)`);
}

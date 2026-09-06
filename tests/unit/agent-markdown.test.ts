import assert from "node:assert/strict";
import test from "node:test";
import {
  AGENT_WARNINGS,
  buildAgentCatalog,
} from "../../src/lib/agent-content.ts";
import {
  MIRROR_PROVINCES,
  MIRROR_ZONES,
  buildMarkdownMirrors,
  mirrorPathForHtmlPath,
  renderClinicMarkdown,
} from "../../src/lib/agent-markdown.ts";

const fixture = {
  id: "markdown-fixture",
  nombre: "Clínica Markdown",
  provincia: "Heredia",
  zona: "San Pablo de Heredia",
  direccion: "Dirección registrada",
  telefono1: "2222-2222",
  telefono2: "",
  whatsapp: "",
  horarioTexto: "L-V 8am-5pm",
  categoriaHorario: "Horario normal" as const,
  emergencias24h: false,
  atiendeExoticos: false,
  cirugiaEmergencia: false,
  atiendeGranja: false,
  atiendePeces: false,
  hotelMascotas: true,
  hotelVerificacion: "no-confirmado",
  hotelFuente: "",
  confidence_score: "medium",
  record_status: "PARTIAL",
  emergency_tier: "Tier C",
  last_verified: "",
  phone_verified: false,
  address_verified: false,
  schedule_verified: false,
  emergency_verified: false,
  has_surgery: false,
  has_hospitalization: false,
  overnight_doctor_present: false,
  accepts_emergency_walkins: false,
  verification_notes: ["Restricción de especie registrada."],
  verification_source: "",
  latitude: 0,
  longitude: 0,
  waze_url: "",
  maps_url: "",
  web: "",
  facebook: "",
  instagram: "",
  slug: "clinica-markdown",
  estado: "pendiente",
  copyDiferenciador: "Copy diferenciador íntegro.",
};

test("mapea solo URLs HTML canónicas a mirrors Markdown", () => {
  assert.deepEqual(mirrorPathForHtmlPath("/"), { kind: "index", htmlPath: "/", mirrorPath: "/md/index.md" });
  assert.equal(mirrorPathForHtmlPath("/clinica/clinica-markdown/")?.mirrorPath, "/md/clinica/clinica-markdown.md");
  assert.equal(mirrorPathForHtmlPath("/provincia/heredia/")?.mirrorPath, "/md/provincia/heredia.md");
  assert.equal(mirrorPathForHtmlPath("/zona/guapiles/")?.mirrorPath, "/md/zona/guapiles.md");
  assert.equal(mirrorPathForHtmlPath("/clinica/clinica-markdown"), null);
  assert.equal(mirrorPathForHtmlPath("/blog/entrada/"), null);
  assert.equal(mirrorPathForHtmlPath("/api/catalog.json"), null);
});

test("genera portada, provincias, zonas y fichas desde el catálogo", () => {
  const mirrors = buildMarkdownMirrors([{ data: fixture, body: "Cuerpo editorial íntegro." }]);
  assert.equal(mirrors.length, 1 + MIRROR_PROVINCES.length + MIRROR_ZONES.length + 1);
  assert.ok(mirrors.some(({ route }) => route.mirrorPath === "/md/index.md"));
  assert.ok(mirrors.some(({ route }) => route.mirrorPath === "/md/provincia/heredia.md"));
  assert.ok(mirrors.some(({ route }) => route.mirrorPath === "/md/zona/san-pablo-heredia.md"));
  assert.ok(mirrors.some(({ route }) => route.mirrorPath === "/md/clinica/clinica-markdown.md"));
});

test("conserva cuerpo, warnings, evidencia y límites de disponibilidad", () => {
  const clinic = buildAgentCatalog([{ data: fixture, body: "Cuerpo editorial íntegro." }]).clinics[0];
  const markdown = renderClinicMarkdown(clinic);
  assert.match(markdown, /Cuerpo editorial íntegro\./);
  for (const warning of AGENT_WARNINGS) assert.match(markdown, new RegExp(warning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(markdown, /Restricción de especie registrada\./);
  assert.match(markdown, /openNow permanece en null/);
  assert.doesNotMatch(markdown, /abierta ahora|abiertas hoy/i);
});

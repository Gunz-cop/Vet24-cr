import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  AGENT_TIME_ZONE,
  AGENT_WARNINGS,
  buildAgentCatalog,
  toAgentClinic,
} from "../../src/lib/agent-content.ts";

const fixture = {
  id: "synthetic-false",
  nombre: "Clínica sintética",
  provincia: "Heredia",
  zona: "San Pablo de Heredia",
  direccion: "Dirección registrada",
  telefono1: "",
  telefono2: "2222-2222",
  whatsapp: "",
  horarioTexto: "Horario por confirmar",
  categoriaHorario: "Horario normal",
  emergencias24h: false,
  atiendeExoticos: true,
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
  has_hospitalization: true,
  overnight_doctor_present: false,
  accepts_emergency_walkins: false,
  verification_notes: ["Restricción de especie registrada: solo perros y gatos."],
  verification_source: "",
  latitude: 0,
  longitude: 0,
  waze_url: "",
  maps_url: "",
  web: "",
  facebook: "",
  instagram: "",
  slug: "clinica-sintetica",
  estado: "pendiente",
  copyDiferenciador: "Texto diferenciador íntegro.",
};

test("proyecta límites conservadores y conserva texto/metadata", () => {
  const clinic = toAgentClinic({ data: fixture, body: "Cuerpo Markdown íntegro." });

  assert.equal(clinic.openNow, null);
  assert.equal(clinic.latitude, null);
  assert.equal(clinic.longitude, null);
  assert.equal(clinic.telefono1, null);
  assert.equal(clinic.last_verified, null);
  assert.equal(clinic.verification_source, null);
  assert.equal(clinic.capacidades.emergencias24h.valorRegistrado, false);
  assert.equal(clinic.capacidades.emergencias24h.estado, "no-confirmado");
  assert.equal(clinic.capacidades.atiendeExoticos.estado, "afirmado");
  assert.equal(clinic.capacidades.hotelMascotas.estado, "afirmado");
  assert.equal(clinic.capacidades.hotelMascotas.valorRegistrado, true);
  assert.equal(clinic.copyDiferenciador, fixture.copyDiferenciador);
  assert.equal(clinic.bodyMarkdown, "Cuerpo Markdown íntegro.");
  assert.deepEqual(clinic.verification_notes, fixture.verification_notes);
  assert.deepEqual(clinic.advertencias, AGENT_WARNINGS);
  assert.equal(AGENT_TIME_ZONE, "America/Costa_Rica");
});

test("mantiene la restricción real del hotel exclusivo para gatos", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "../../src/content/clinicas/hospital-vet-medical-care-heredia.md"), "utf8");
  assert.match(source, /hotel exclusivamente para gatos con reserva previa/);
  assert.match(source, /Hotel exclusivo para gatos, requiere reserva previa/);

  const clinic = toAgentClinic({
    data: {
      ...fixture,
      slug: "hospital-vet-medical-care-heredia",
      hotelMascotas: true,
      hotelVerificacion: "confirmado",
      hotelFuente: "Confirmación directa; hotel exclusivo para gatos, requiere reserva previa",
      copyDiferenciador: source.match(/copyDiferenciador: "([^"]+)/)?.[1] ?? fixture.copyDiferenciador,
    },
    body: source.split("---").slice(2).join("---").trim(),
  });
  assert.match(clinic.bodyMarkdown, /hotel exclusivamente para gatos con reserva previa/);
  assert.match(clinic.hotelFuente ?? "", /exclusivo para gatos, requiere reserva previa/);
  assert.equal(clinic.capacidades.hotelMascotas.valorRegistrado, true);
});

test("ordena el catálogo por slug sin filtrar estado", () => {
  const catalog = buildAgentCatalog([
    { data: { ...fixture, slug: "zeta", estado: "inactivo" } },
    { data: { ...fixture, slug: "alfa", estado: "publicado" } },
  ]);
  assert.deepEqual(catalog.clinics.map((clinic) => clinic.slug), ["alfa", "zeta"]);
  assert.equal(catalog.clinics.length, 2);
});

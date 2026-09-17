import assert from "node:assert/strict";
import { test } from "node:test";
import { handleStatusOverride } from "../../src/pages/api/status-override.ts";

const schedule = { version: 1, timeZone: "America/Costa_Rica", days: Array.from({ length: 7 }, () => ({ kind: "closed" })), exceptions: [] };

test("GET HTTP público devuelve el override activo desde D1", async () => {
  const db = {
    prepare() {
      return { bind() { return { async first() { return { is_temporarily_closed: 1, override_status_text: "Cierre por mantenimiento", schedule_json: null, expires_at: "2099-01-01T00:00:00Z", revision: 3 }; } }; } };
    },
  } as unknown as D1Database;
  const response = await handleStatusOverride(new Request("https://vet24cr.com/api/status-override?slug=clinica-demo"), { DB: db });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, override: { is_temporarily_closed: true, override_status_text: "Cierre por mantenimiento", override_schedule_text: null, expires_at: "2099-01-01T00:00:00Z", revision: 3 } });
});

test("GET HTTP público normaliza el horario estructurado al texto de la UI", async () => {
  const db = {
    prepare() {
      return { bind() { return { async first() { return { is_temporarily_closed: 0, override_status_text: null, schedule_json: JSON.stringify(schedule), expires_at: "2099-01-01T00:00:00Z", revision: 4 }; } }; } };
    },
  } as unknown as D1Database;
  const response = await handleStatusOverride(new Request("https://vet24cr.com/api/status-override?slug=clinica-demo"), { DB: db });
  assert.equal((await response.json() as { override: { override_schedule_text: unknown } }).override.override_schedule_text, "Domingo cerrado | Lunes cerrado | Martes cerrado | Miércoles cerrado | Jueves cerrado | Viernes cerrado | Sábado cerrado");
});

test("GET HTTP público rechaza expiraciones SQLite malformadas o ya vencidas sin romper la respuesta", async () => {
  const db = {
    prepare() {
      return { bind() { return { async first() { return { is_temporarily_closed: 1, override_status_text: "vencido", schedule_json: null, expires_at: "2026-09-16 00:00:00", revision: 5 }; } }; } };
    },
  } as unknown as D1Database;
  const response = await handleStatusOverride(new Request("https://vet24cr.com/api/status-override?slug=clinica-demo"), { DB: db });
  assert.deepEqual(await response.json(), { success: true, override: null });
});

test("GET HTTP público degrada a 503 si D1 no está disponible", async () => {
  const response = await handleStatusOverride(new Request("https://vet24cr.com/api/status-override?slug=clinica-demo"));
  assert.equal(response.status, 503);
  assert.equal((await response.json() as { error?: string }).error, "LIVE_UNAVAILABLE");
});

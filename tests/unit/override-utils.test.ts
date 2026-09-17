import assert from "node:assert/strict";
import { test } from "node:test";
import { isOverrideUnexpired, parseOverrideExpiration } from "../../src/lib/override-utils.ts";

test("expiración acepta ISO UTC y datetime UTC de SQLite usando tiempo absoluto", () => {
  const now = Date.parse("2026-09-16T12:00:00Z");
  assert.equal(parseOverrideExpiration("2026-09-16T13:00:00Z"), now + 3600000);
  assert.equal(parseOverrideExpiration("2026-09-16 13:00:00"), now + 3600000);
  assert.equal(isOverrideUnexpired("2026-09-16 13:00:00", now), true);
  assert.equal(isOverrideUnexpired("2026-09-16T11:00:00Z", now), false);
});

test("expiración desconocida falla cerrada y null significa sin vencimiento", () => {
  assert.equal(parseOverrideExpiration("09/16/2026"), null);
  assert.equal(isOverrideUnexpired("09/16/2099", 0), false);
  assert.equal(isOverrideUnexpired(null, Date.now()), true);
});

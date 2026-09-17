import assert from "node:assert/strict";
import test from "node:test";
import { validIdempotencyKey } from "../../src/lib/admin/auth.ts";

test("contrato admin: solo acepta Idempotency-Key UUID v4/v7 canónica", () => {
  assert.equal(
    validIdempotencyKey("550e8400-e29b-41d4-a716-446655440000"),
    true,
  );
  assert.equal(
    validIdempotencyKey("018f2f2b-7b47-7cc8-9d1a-4c1b8e1a2f00"),
    true,
  );
  for (const key of [
    null,
    "",
    "550E8400-E29B-41D4-A716-446655440000",
    "550e8400-e29b-31d4-a716-446655440000",
    "not-a-uuid",
  ])
    assert.equal(validIdempotencyKey(key), false, String(key));
});

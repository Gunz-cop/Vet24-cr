import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { claimProposalsForTest, runProposalRunner } from "../../src/lib/admin/proposal-runner.ts";

const migrationBase = readFileSync(new URL("../../migrations/0001_admin_panel.sql", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../migrations/0002_proposal_runner.sql", import.meta.url), "utf8");
const apiSource = readFileSync(new URL("../../src/lib/admin/api.ts", import.meta.url), "utf8");
const runnerSource = readFileSync(new URL("../../src/lib/admin/proposal-runner.ts", import.meta.url), "utf8");
const workerSource = readFileSync(new URL("../../src/worker.ts", import.meta.url), "utf8");

test("la migración del runner añade todas las columnas de lease y progreso", () => {
  for (const column of ["next_attempt_at", "lease_owner", "lease_until", "state_version", "branch_name", "commit_sha", "blob_sha", "tree_sha", "parent_sha"]) {
    assert.match(migration, new RegExp(`ADD COLUMN ${column}`));
  }
  assert.match(migration, /idx_clinic_proposals_ready/);
});

test("el claim usa CAS de state_version y lease vencida", async () => {
  const calls: string[] = [];
  const db = {
    prepare(sql: string) {
      calls.push(sql);
      return {
        bind(..._values: unknown[]) {
          return {
            async all() { return { results: [{ operation_id: "op-1", slug: "demo", base_commit: "a", expected_blob_sha: null, payload_json: "{}", status: "pending", stage: null, attempts: 0, state_version: 4, branch_name: null, commit_sha: null, pr_url: null }] }; },
            async run() { return { meta: { changes: 1 } }; },
          };
        },
      };
    },
  } as unknown as D1Database;
  const claimed = await claimProposalsForTest(db, 1_700_000_000);
  assert.equal(claimed.length, 1);
  assert.match(calls[0], /lease_until/);
  assert.match(calls[1], /state_version = \?/);
  assert.match(calls[1], /lease_until IS NULL OR lease_until < datetime\('now'\)/);
});

test("la propuesta HTTP conserva idempotencia y el runner reconcilia branch/PR", () => {
  assert.match(apiSource, /INSERT INTO clinic_proposals/);
  assert.match(apiSource, /reserveIdempotency/);
  assert.match(runnerSource, /git\/ref\/heads/);
  assert.match(runnerSource, /pulls\?head=/);
  assert.match(runnerSource, /state_version/);
  assert.match(runnerSource, /stage: "blob"/);
  assert.match(runnerSource, /stage: "tree"/);
  assert.match(runnerSource, /stage: "commit"/);
});

test("runProposalRunner aplica 0002 y respeta Retry-After de GitHub para 429/503", async (t) => {
  for (const status of [429, 503]) {
    await t.test(`status ${status}`, async () => {
      const mf = new Miniflare(convertV4MiniflareOptions({
        name: `proposal-runner-${status}`,
        script: "export default { fetch() { return new Response('ok') } }",
        modules: true,
        d1Databases: ["DB"],
      }));
      const originalFetch = globalThis.fetch;
      try {
        const db = await mf.getD1Database("DB");
        for (const sql of `${migrationBase}\n${migration}`.replace(/^--.*$/gm, "").split(";").map((statement) => statement.trim()).filter(Boolean)) {
          await db.prepare(sql).run();
        }
        await db.prepare("INSERT INTO clinic_proposals (operation_id, subject, idempotency_key, payload_hash, slug, base_commit, payload_json, status, stage, attempts, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'branch_created', 'tree', 0, datetime('now'))")
          .bind("op-retry", "editor", "key-retry", "hash", "demo", "base", "{}")
          .run();

        globalThis.fetch = async () => Response.json({ message: "busy" }, { status, headers: { "Retry-After": "120" } });
        const result = await runProposalRunner({ DB: db, GITHUB_API_URL: "https://api.github.test", GITHUB_REPOSITORY: "org/repo", GITHUB_TOKEN: "test-token" });
        assert.deepEqual(result, { processed: 1, skipped: false });

        const row = await db.prepare("SELECT status, attempts, retryable, next_attempt_at FROM clinic_proposals WHERE operation_id = ?").bind("op-retry").first<{ status: string; attempts: number; retryable: number; next_attempt_at: string }>();
        assert.equal(row?.status, "branch_created");
        assert.equal(row?.attempts, 1);
        assert.equal(row?.retryable, 0);
        assert.ok(row?.next_attempt_at);
        const delay = Date.parse(`${row!.next_attempt_at.replace(" ", "T")}Z`) - Date.now();
        assert.ok(delay >= 119_000 && delay <= 121_000, `Retry-After delay was ${delay}ms`);
      } finally {
        globalThis.fetch = originalFetch;
        await mf.dispose();
      }
    });
  }
});

test("scheduled delega el trabajo al runner y espera sus errores", () => {
  assert.match(workerSource, /async scheduled\(/);
  assert.match(workerSource, /context\.waitUntil\(runProposalRunner\(env\)\.catch/);
});

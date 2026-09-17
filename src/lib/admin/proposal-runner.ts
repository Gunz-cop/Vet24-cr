type RunnerEnv = {
  DB?: D1Database;
  GITHUB_API_URL?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_TOKEN?: string;
  GITHUB_BASE_BRANCH?: string;
};

type ProposalRow = {
  operation_id: string;
  slug: string;
  base_commit: string;
  expected_blob_sha: string | null;
  payload_json: string;
  status: string;
  stage: string | null;
  attempts: number;
  state_version: number;
  branch_name: string | null;
  commit_sha: string | null;
  blob_sha: string | null;
  tree_sha: string | null;
  parent_sha: string | null;
  evidence_blob_sha: string | null;
  pr_url: string | null;
};

const MAX_PER_TICK = 5;
const MAX_STAGE_ATTEMPTS = 3;
const LEASE_SECONDS = 120;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRY_AFTER_SECONDS = 24 * 60 * 60;

function config(env: RunnerEnv) {
  if (!env.DB || !env.GITHUB_API_URL || !env.GITHUB_REPOSITORY || !env.GITHUB_TOKEN) return null;
  return { db: env.DB, api: env.GITHUB_API_URL.replace(/\/$/, ""), repository: env.GITHUB_REPOSITORY, token: env.GITHUB_TOKEN, base: env.GITHUB_BASE_BRANCH || "main" };
}

function waitSeconds(attempts: number) {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const jitter = random[0] % 16;
  return Math.min(4, 2 ** Math.max(0, attempts - 1)) * 60 + jitter;
}

function branchFor(operationId: string) {
  return `admin/clinic-proposal/${operationId}`;
}

async function github(configured: NonNullable<ReturnType<typeof config>>, path: string, init: RequestInit = {}): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${configured.api}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${configured.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const retryAfter = response.headers.get("Retry-After");
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(`GitHub ${response.status}`) as Error & { status?: number; retryAfter?: string };
      error.status = response.status;
      error.retryAfter = retryAfter || undefined;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function retryAfterSeconds(error: unknown, now = Date.now()) {
  const status = Number((error as { status?: number })?.status || 0);
  if (status !== 429 && status !== 503) return undefined;
  const value = (error as { retryAfter?: string })?.retryAfter?.trim();
  if (!value) return undefined;

  let seconds: number;
  if (/^\d+$/.test(value)) {
    seconds = Number(value);
  } else {
    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return undefined;
    seconds = Math.max(0, Math.ceil((timestamp - now) / 1000));
  }
  if (!Number.isSafeInteger(seconds) || seconds < 0) return undefined;
  return Math.min(seconds, MAX_RETRY_AFTER_SECONDS);
}

function yamlScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function clinicMarkdown(_slug: string, clinic: Record<string, unknown>, source: string | null, bodyOverride?: string) {
  const body = bodyOverride ?? source?.split(/^---\s*$/m).slice(2).join("---")?.replace(/^\r?\n/, "") ?? "";
  const frontmatter = Object.entries(clinic)
    .filter(([key]) => key !== "bodyMarkdown")
    .map(([key, value]) => `${key}: ${yamlScalar(value)}`)
    .join("\n");
  return `---\n${frontmatter}\n---\n\n${body}`;
}

const rawSources = typeof import.meta.glob === "function"
  ? import.meta.glob("../../content/clinicas/*.{md,mdx}", { query: "?raw", import: "default", eager: true }) as Record<string, string>
  : {};
function sourceFor(slug: string) {
  const key = Object.keys(rawSources).find((candidate) => candidate.endsWith(`/${slug}.md`) || candidate.endsWith(`/${slug}.mdx`));
  return key ? rawSources[key] : null;
}

function contentPath(slug: string) {
  return `src/content/clinicas/${slug}.md`;
}

async function contentBlob(configured: NonNullable<ReturnType<typeof config>>, path: string, ref: string) {
  const result = await github(configured, `/repos/${configured.repository}/contents/${path}?ref=${encodeURIComponent(ref)}`) as Record<string, unknown>;
  if (typeof result.sha !== "string" || typeof result.content !== "string") throw new Error("SOURCE_NOT_FOUND");
  return { sha: result.sha, content: result.content.replace(/\n/g, "") };
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

async function claim(db: D1Database, now: number) {
  const owner = crypto.randomUUID();
  const leaseUntil = now + LEASE_SECONDS;
  const candidates = await db.prepare("SELECT operation_id, slug, base_commit, expected_blob_sha, payload_json, status, stage, attempts, state_version, branch_name, commit_sha, blob_sha, tree_sha, parent_sha, evidence_blob_sha, pr_url FROM clinic_proposals WHERE status IN ('pending','branch_created','committed') AND (next_attempt_at IS NULL OR next_attempt_at <= datetime('now')) AND (lease_until IS NULL OR lease_until < datetime('now')) ORDER BY updated_at ASC LIMIT ?").bind(MAX_PER_TICK).all<ProposalRow>();
  const claimed: Array<{ row: ProposalRow; owner: string; version: number }> = [];
  for (const candidate of candidates.results) {
    const version = Number(candidate.state_version || 0) + 1;
    const result = await db.prepare("UPDATE clinic_proposals SET lease_owner = ?, lease_until = datetime(?, 'unixepoch'), state_version = ?, updated_at = datetime('now') WHERE operation_id = ? AND state_version = ? AND status = ? AND (lease_until IS NULL OR lease_until < datetime('now'))").bind(owner, leaseUntil, version, candidate.operation_id, Number(candidate.state_version || 0), candidate.status).run();
    if (Number(result.meta?.changes || 0) === 1) claimed.push({ row: { ...candidate, state_version: version }, owner, version });
  }
  return claimed;
}

export async function claimProposalsForTest(db: D1Database, now = Math.floor(Date.now() / 1000)) {
  return claim(db, now);
}

async function persist(db: D1Database, operationId: string, owner: string, version: number, fields: Record<string, unknown>) {
  const assignments = Object.keys(fields).map((key) => `${key} = ?`).join(", ");
  const values = Object.values(fields);
  const result = await db.prepare(`UPDATE clinic_proposals SET ${assignments}, lease_owner = NULL, lease_until = NULL, state_version = state_version + 1, updated_at = datetime('now') WHERE operation_id = ? AND lease_owner = ? AND state_version = ?`).bind(...values, operationId, owner, version).run();
  if (Number(result.meta?.changes || 0) !== 1) throw new Error("LEASE_LOST");
}

async function failProposal(db: D1Database, claimInfo: { row: ProposalRow; owner: string; version: number }, error: unknown, errorCode: string, retryable: boolean, attempts: number) {
  const shouldRetry = retryable && attempts < MAX_STAGE_ATTEMPTS;
  const next = shouldRetry
    ? new Date(Date.now() + (retryAfterSeconds(error) ?? waitSeconds(attempts)) * 1000).toISOString().replace("T", " ").replace("Z", "")
    : null;
  await persist(db, claimInfo.row.operation_id, claimInfo.owner, claimInfo.version, {
    status: shouldRetry ? claimInfo.row.status : "failed",
    error_code: errorCode,
    retryable: shouldRetry ? 0 : retryable ? 1 : 0,
    attempts,
    next_attempt_at: next,
  });
}

function isRetryable(error: unknown) {
  const status = Number((error as { status?: number })?.status || 0);
  return status === 408 || status === 429 || status >= 500 || error instanceof TypeError || (error instanceof Error && error.name === "AbortError");
}

async function processOne(configured: NonNullable<ReturnType<typeof config>>, claimInfo: { row: ProposalRow; owner: string; version: number }) {
  const { db } = configured;
  const row = claimInfo.row;
  const payload = JSON.parse(row.payload_json) as { newClinic?: boolean; clinic?: Record<string, unknown>; evidence?: Record<string, unknown>; bodyMarkdown?: string };
  const branch = row.branch_name || branchFor(row.operation_id);
  const path = contentPath(row.slug);
  try {
    if (row.status === "pending") {
      const base = await github(configured, `/repos/${configured.repository}/git/ref/heads/${encodeURIComponent(configured.base)}`) as Record<string, unknown>;
      const baseSha = String((base.object as Record<string, unknown>)?.sha || "");
      if (baseSha !== row.base_commit) throw new Error("BASE_CONFLICT");
      let existing: Record<string, unknown> | null = null;
      try { existing = await github(configured, `/repos/${configured.repository}/git/ref/heads/${encodeURIComponent(branch)}`) as Record<string, unknown>; } catch (error) { if ((error as { status?: number }).status !== 404) throw error; }
      if (!existing) await github(configured, `/repos/${configured.repository}/git/refs`, { method: "POST", body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }) });
      await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { status: "branch_created", stage: "blob", branch_name: branch, next_attempt_at: null, error_code: null, attempts: 0 });
      return;
    }
    if (row.status === "branch_created") {
      if (row.stage === "blob") {
        const source = row.expected_blob_sha ? await contentBlob(configured, path, row.base_commit) : null;
        if (source && source.sha !== row.expected_blob_sha) throw new Error("SOURCE_CONFLICT");
        const content = clinicMarkdown(row.slug, payload.clinic || {}, source ? decodeBase64(source.content) : sourceFor(row.slug), payload.bodyMarkdown);
        const blob = await github(configured, `/repos/${configured.repository}/git/blobs`, { method: "POST", body: JSON.stringify({ content, encoding: "utf-8" }) }) as Record<string, unknown>;
        const evidence = payload.evidence;
        if (!evidence || typeof evidence !== "object") throw new Error("EVIDENCE_NOT_FOUND");
        const evidenceBlob = await github(configured, `/repos/${configured.repository}/git/blobs`, { method: "POST", body: JSON.stringify({ content: `${JSON.stringify(evidence, null, 2)}\n`, encoding: "utf-8" }) }) as Record<string, unknown>;
        await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { stage: "tree", blob_sha: String(blob.sha), evidence_blob_sha: String(evidenceBlob.sha), next_attempt_at: null, error_code: null, attempts: 0 });
        return;
      }
      if (row.stage === "tree") {
        const branchRef = await github(configured, `/repos/${configured.repository}/git/ref/heads/${encodeURIComponent(branch)}`) as Record<string, unknown>;
        const parent = String((branchRef.object as Record<string, unknown>)?.sha || "");
        const evidencePath = `research/clinics/${row.slug}.json`;
        const tree = await github(configured, `/repos/${configured.repository}/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: parent, tree: [{ path, mode: "100644", type: "blob", sha: row.blob_sha }, { path: evidencePath, mode: "100644", type: "blob", sha: row.evidence_blob_sha }] }) }) as Record<string, unknown>;
        await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { stage: "commit", tree_sha: String(tree.sha), parent_sha: parent, next_attempt_at: null, error_code: null, attempts: 0 });
        return;
      }
      if (row.stage === "commit") {
        const commit = await github(configured, `/repos/${configured.repository}/git/commits`, { method: "POST", body: JSON.stringify({ message: `admin: actualizar ficha ${row.slug}`, tree: row.tree_sha, parents: [row.parent_sha] }) }) as Record<string, unknown>;
        await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { stage: "ref", commit_sha: String(commit.sha), next_attempt_at: null, error_code: null, attempts: 0 });
        return;
      }
      if (row.stage === "ref") {
        await github(configured, `/repos/${configured.repository}/git/refs/heads/${encodeURIComponent(branch)}`, { method: "PATCH", body: JSON.stringify({ sha: row.commit_sha, force: false }) });
        await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { status: "committed", stage: "commit", branch_name: branch, next_attempt_at: null, error_code: null, attempts: 0 });
      }
      return;
    }
    if (row.status === "committed") {
      const existing = await github(configured, `/repos/${configured.repository}/pulls?head=${encodeURIComponent(`${configured.repository.split("/")[0]}:${branch}`)}&base=${encodeURIComponent(configured.base)}&state=open`);
      const prs = Array.isArray(existing) ? existing as Array<Record<string, unknown>> : [];
      const pr = (prs[0] || await github(configured, `/repos/${configured.repository}/pulls`, { method: "POST", body: JSON.stringify({ title: `Actualizar ficha ${row.slug}`, head: branch, base: configured.base, body: `Propuesta administrativa ${row.operation_id}. Sin auto-merge.` }) })) as Record<string, unknown>;
      await persist(db, row.operation_id, claimInfo.owner, claimInfo.version, { status: "pr_open", stage: "pr", pr_url: String(pr.html_url || ""), next_attempt_at: null, error_code: null, attempts: 0 });
    }
  } catch (error) {
    const attempts = Number(row.attempts || 0) + 1;
    const retryable = isRetryable(error);
    await failProposal(db, claimInfo, error, error instanceof Error ? error.message.slice(0, 80) : "GITHUB_ERROR", retryable, attempts);
  }
}

export async function runProposalRunner(env: RunnerEnv) {
  const configured = config(env);
  if (!configured) return { processed: 0, skipped: true, reason: "CONFIG_MISSING" };
  const claims = await claim(configured.db, Math.floor(Date.now() / 1000));
  for (const claimInfo of claims) await processOne(configured, claimInfo);
  return { processed: claims.length, skipped: false };
}

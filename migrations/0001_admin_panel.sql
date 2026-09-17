-- Admin tables are additive and independent from the legacy Pages tables.
-- This migration is safe on an empty database and does not ALTER legacy tables.
CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clinic_slug TEXT NOT NULL,
  clinic_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT NOT NULL,
  contact TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clinic_overrides (
  clinic_slug TEXT PRIMARY KEY,
  is_temporarily_closed INTEGER NOT NULL DEFAULT 0,
  override_status_text TEXT,
  override_schedule_text TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_overrides (
  clinic_slug TEXT PRIMARY KEY,
  is_temporarily_closed INTEGER NOT NULL DEFAULT 0,
  override_status_text TEXT,
  schedule_json TEXT,
  expires_at TEXT,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_by TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_report_state (
  report_id INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  revision INTEGER NOT NULL DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TEXT,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS admin_idempotency (
  subject TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status INTEGER NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (subject, idempotency_key)
);

CREATE TABLE IF NOT EXISTS admin_rate_buckets (
  subject TEXT PRIMARY KEY,
  window_started INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS override_audit (
  event_id TEXT PRIMARY KEY,
  clinic_slug TEXT NOT NULL,
  revision INTEGER NOT NULL,
  actor_sub TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (clinic_slug, revision)
);

CREATE TABLE IF NOT EXISTS clinic_proposals (
  operation_id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  slug TEXT NOT NULL,
  base_commit TEXT NOT NULL,
  expected_blob_sha TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'branch_created', 'committed', 'pr_open', 'failed')),
  stage TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  pr_url TEXT,
  error_code TEXT,
  retryable INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (subject, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_admin_overrides_active ON admin_overrides (active, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_idempotency_created ON admin_idempotency (created_at);
CREATE INDEX IF NOT EXISTS idx_clinic_proposals_subject ON clinic_proposals (subject, updated_at);

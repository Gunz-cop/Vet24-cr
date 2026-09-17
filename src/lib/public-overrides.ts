import { isOverrideUnexpired } from './override-utils.ts';

export type PublicOverride = {
  temporarilyClosed: boolean;
  message: string | null;
  schedule: unknown;
  expiresAt: string | null;
  revision: number;
};

export async function getPublicOverride(slug: string, runtimeEnv?: { DB?: D1Database }): Promise<PublicOverride | null> {
  const db = runtimeEnv?.DB;
  if (!db) return null;
  const row = await db.prepare("SELECT is_temporarily_closed, override_status_text, schedule_json, expires_at, revision FROM admin_overrides WHERE clinic_slug = ? AND active = 1").bind(slug).first<Record<string, unknown>>();
  if (!row) return null;
  if (!isOverrideUnexpired(row.expires_at)) return null;
  const schedule = row.schedule_json ? JSON.parse(String(row.schedule_json)) : null;
  return {
    temporarilyClosed: Boolean(row.is_temporarily_closed),
    message: row.override_status_text ? String(row.override_status_text) : null,
    schedule,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    revision: Number(row.revision || 0),
  };
}

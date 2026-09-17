/**
 * Override expirations are stored in either the ISO UTC form emitted by the
 * admin UI or SQLite's UTC datetime form. Keep the accepted formats explicit;
 * malformed persisted values fail closed instead of becoming active.
 */
export function parseOverrideExpiration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const isoUtc = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)$/;
  const sqliteUtc = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})$/;
  const normalized = isoUtc.test(value)
    ? value
    : sqliteUtc.test(value)
      ? `${value.replace(" ", "T")}Z`
      : null;
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isOverrideUnexpired(value: unknown, now = Date.now()): boolean {
  if (value === null || value === undefined) return true;
  const timestamp = parseOverrideExpiration(value);
  return timestamp !== null && timestamp > now;
}

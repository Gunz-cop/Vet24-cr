-- Schema definition for Vet24 Costa Rica (Cloudflare D1)

-- 1. Table for incorrect clinic data reports submitted by users
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clinic_slug TEXT NOT NULL,
    clinic_name TEXT NOT NULL,
    reason TEXT NOT NULL,
    description TEXT NOT NULL,
    contact TEXT,
    ip_hash TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 2. Table for live, real-time overrides of clinic statuses (e.g. temporary closures, special notes)
CREATE TABLE IF NOT EXISTS clinic_overrides (
    clinic_slug TEXT PRIMARY KEY,
    is_temporarily_closed INTEGER DEFAULT 0, -- 0 = active, 1 = temporarily closed
    override_status_text TEXT,               -- Custom message (e.g. "Saturado en emergencias hasta las 6 AM")
    override_schedule_text TEXT,             -- Temporary override of schedule text
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);

-- 3. Table for tracking search logs (analytics)
CREATE TABLE IF NOT EXISTS search_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT,
    province TEXT,
    canton TEXT,
    filter_type TEXT, -- e.g. '24/7', 'exoticos', 'sos'
    ip_hash TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);

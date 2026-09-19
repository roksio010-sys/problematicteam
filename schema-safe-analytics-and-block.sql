-- Run once against the existing D1 database. Do not rerun after successful execution.
ALTER TABLE visits ADD COLUMN device_model TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN browser TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN browser_version TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN language TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN locale TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN timezone TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN hour_cycle TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN hardware_threads INTEGER;
ALTER TABLE visits ADD COLUMN device_memory_gb REAL;
ALTER TABLE visits ADD COLUMN battery_level INTEGER;
ALTER TABLE visits ADD COLUMN battery_charging INTEGER;
ALTER TABLE visits ADD COLUMN referrer TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN visitor_id TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE visits ADD COLUMN max_scroll INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS blocked_visitors (visitor_id TEXT PRIMARY KEY, blocked_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON visits(visitor_id);

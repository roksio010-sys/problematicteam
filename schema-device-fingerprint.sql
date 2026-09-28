-- Обновление 2026-09-28: отпечаток устройства (FingerprintJS) и блокировка по нему
ALTER TABLE visits ADD COLUMN fpjs_id TEXT;
CREATE TABLE IF NOT EXISTS blocked_fingerprints (
  fp_hash TEXT PRIMARY KEY,
  blocked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits (visitor_id, id);

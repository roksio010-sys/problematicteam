-- Связка «умное распознавание устройства»: стабильный ключ по железу+экрану+системным настройкам.
-- Применять после schema-safe-analytics-and-block.sql
ALTER TABLE visits ADD COLUMN device_key TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN device_profile TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS blocked_device_keys (device_key TEXT PRIMARY KEY, blocked_at INTEGER NOT NULL, via_ip TEXT NOT NULL DEFAULT '', profile TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_visits_device_key ON visits(device_key);

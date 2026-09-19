-- Run once AFTER schema-device-migration.sql and schema-safe-analytics-and-block.sql.
-- Do not rerun after successful execution.
ALTER TABLE visits ADD COLUMN client_cert_serial TEXT NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS blocked_client_certs (
  serial TEXT PRIMARY KEY,
  blocked_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_visits_client_cert_serial ON visits(client_cert_serial);

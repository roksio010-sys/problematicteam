-- Run once against the existing Cloudflare D1 database used by the Worker.
-- These columns store browser-reported device information for new visits.
ALTER TABLE visits ADD COLUMN device_type TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN os TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN screen_resolution TEXT NOT NULL DEFAULT '';
ALTER TABLE visits ADD COLUMN device_pixel_ratio REAL;

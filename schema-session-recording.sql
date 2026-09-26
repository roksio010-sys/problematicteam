-- Запись сессий: снимки экрана и события (клики, скролл).
-- Выполнить один раз в Cloudflare D1, привязанной к Worker pmt-visitor-log.
-- Таблицы rec_shots и rec_events очищаются Worker: снимки старше 14 дней, события старше 30 дней.

CREATE TABLE IF NOT EXISTS rec_shots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  taken_at INTEGER NOT NULL,
  viewport TEXT NOT NULL DEFAULT '',
  scroll_y INTEGER NOT NULL DEFAULT 0,
  scroll_pct INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  mime TEXT NOT NULL DEFAULT 'image/jpeg',
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rec_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL,
  event_at INTEGER NOT NULL,
  x REAL,
  y REAL,
  vx REAL,
  vy REAL,
  viewport TEXT NOT NULL DEFAULT '',
  scroll_y INTEGER NOT NULL DEFAULT 0,
  scroll_pct INTEGER NOT NULL DEFAULT 0,
  target TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  shot_id INTEGER REFERENCES rec_shots(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rec_shots_session ON rec_shots (session_id, taken_at);
CREATE INDEX IF NOT EXISTS idx_rec_shots_taken ON rec_shots (taken_at);
CREATE INDEX IF NOT EXISTS idx_rec_events_session ON rec_events (session_id, event_at);
CREATE INDEX IF NOT EXISTS idx_rec_events_taken ON rec_events (event_at);

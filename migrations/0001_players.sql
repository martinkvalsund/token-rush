-- One row per player (random per-device id): their best run on the global leaderboard.
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  distance INTEGER NOT NULL,
  hat TEXT NOT NULL DEFAULT '',
  outfit TEXT NOT NULL DEFAULT '',
  updated INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS players_rank ON players (score DESC, updated ASC);

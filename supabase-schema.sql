-- =============================================
-- PCSO Hot Numbers – Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================

-- 1. Main draws table
CREATE TABLE IF NOT EXISTS draws (
  id          BIGSERIAL PRIMARY KEY,
  game        TEXT        NOT NULL,          -- e.g. "6/58"
  draw_date   DATE        NOT NULL,
  numbers     INTEGER[]   NOT NULL,          -- e.g. {1,15,23,34,45,58}
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT draws_unique UNIQUE (game, draw_date)
);

-- Index for fast per-game queries sorted by date
CREATE INDEX IF NOT EXISTS idx_draws_game_date ON draws (game, draw_date DESC);

-- 2. Sync log – tracks when each game was last scraped
CREATE TABLE IF NOT EXISTS sync_log (
  id           BIGSERIAL PRIMARY KEY,
  game         TEXT        NOT NULL,
  synced_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  draws_found  INTEGER     DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_log_game ON sync_log (game, synced_at DESC);

-- 3. Row-Level Security (allow public read, service role writes)
ALTER TABLE draws    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Anyone can read draws (your Next.js frontend uses anon key)
CREATE POLICY "Public read draws"
  ON draws FOR SELECT
  USING (true);

-- Only the service role (server-side scraper) can insert/update
CREATE POLICY "Service role insert draws"
  ON draws FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role update draws"
  ON draws FOR UPDATE
  USING (auth.role() = 'service_role');

-- Anyone can read sync log
CREATE POLICY "Public read sync_log"
  ON sync_log FOR SELECT
  USING (true);

CREATE POLICY "Service role insert sync_log"
  ON sync_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- =============================================
-- DONE! Your database is ready.
-- =============================================

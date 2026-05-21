// pages/api/scrape.js
// Free version - scrapes lottopcso.com without Anthropic API
// Uses direct HTML parsing instead

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GAME_URLS = {
  "6/58": "https://www.lottopcso.com/6-58-lotto-result-history-and-summary/",
  "6/55": "https://www.lottopcso.com/6-55-lotto-result-history-and-summary/",
  "6/49": "https://www.lottopcso.com/6-49-lotto-result-history-and-summary/",
  "6/45": "https://www.lottopcso.com/6-45-lotto-result-history-and-summary/",
  "6/42": "https://www.lottopcso.com/6-42-lotto-result-history-and-summary/",
};

// Parse lottery results from raw HTML
function parseDraws(html) {
  const draws = [];

  // Match date patterns like "May 17, 2026" or "2026-05-17"
  const rowPattern = /(\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})[^0-9]*(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})[^\d]+(\d{1,2})/gi;

  let match;
  while ((match = rowPattern.exec(html)) !== null) {
    const dateStr = match[1];
    const numbers = [+match[2], +match[3], +match[4], +match[5], +match[6], +match[7]];

    // Validate numbers are reasonable lottery numbers
    if (numbers.every(n => n >= 1 && n <= 58) && new Set(numbers).size === 6) {
      // Parse date
      let date;
      try {
        date = new Date(dateStr).toISOString().split("T")[0];
      } catch {
        continue;
      }
      if (date && date !== "Invalid Date") {
        draws.push({ date, numbers });
      }
    }
  }

  return draws;
}

async function scrapeGame(game, url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html",
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  const html = await response.text();
  const draws = parseDraws(html);
  return draws;
}

async function saveDraws(game, draws) {
  if (draws.length === 0) return { inserted: 0, total: 0 };

  const rows = draws.map(d => ({
    game,
    draw_date: d.date,
    numbers: d.numbers,
  }));

  const { error, count } = await supabase
    .from("draws")
    .upsert(rows, { onConflict: "game,draw_date", ignoreDuplicates: true })
    .select("id", { count: "exact" });

  if (error) throw error;

  await supabase.from("sync_log").insert({
    game,
    synced_at: new Date().toISOString(),
    draws_found: rows.length,
  });

  return { inserted: count || 0, total: rows.length };
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const results = {};
  const errors = {};
  const gameFilter = req.query.game;
  const gamesToScrape = gameFilter
    ? { [gameFilter]: GAME_URLS[gameFilter] }
    : GAME_URLS;

  for (const [game, url] of Object.entries(gamesToScrape)) {
    try {
      console.log(`Scraping ${game}...`);
      const draws = await scrapeGame(game, url);
      const result = await saveDraws(game, draws);
      results[game] = result;
    } catch (err) {
      console.error(`Error scraping ${game}:`, err.message);
      errors[game] = err.message;
    }
  }

  res.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
    errors,
  });
}

// pages/api/scrape.js
// Called automatically by Vercel Cron 3x/week after each PCSO draw
// Schedule: Tue, Thu, Fri, Sun at 9:30 PM PHT (13:30 UTC)
// Protected by a secret token so only the cron job can trigger it

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

// Ask Claude to fetch and parse the lottery page
async function scrapeGame(game, url) {
  const prompt = `Fetch the page at ${url} and extract ALL lottery draw results from the table.
Return ONLY valid JSON, no markdown, no explanation:
{"draws":[{"date":"YYYY-MM-DD","numbers":[n1,n2,n3,n4,n5,n6]},...],"count":N}
Extract every draw you can find. Each draw must have exactly 6 numbers. Skip draws with missing data.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");

  // Extract JSON from response
  const match = text.match(/\{[\s\S]*"draws"[\s\S]*\}/);
  if (!match) throw new Error(`No JSON found for ${game}`);
  return JSON.parse(match[0]);
}

// Upsert draws into Supabase (insert new ones, skip duplicates)
async function saveDraws(game, draws) {
  const rows = draws
    .filter(d => d.date && d.numbers?.length === 6)
    .map(d => ({
      game,
      draw_date: d.date,
      numbers: d.numbers,
    }));

  if (rows.length === 0) return { inserted: 0 };

  // upsert = insert, skip if (game, draw_date) already exists
  const { error, count } = await supabase
    .from("draws")
    .upsert(rows, { onConflict: "game,draw_date", ignoreDuplicates: true })
    .select("id", { count: "exact" });

  if (error) throw error;

  // Log the sync
  await supabase.from("sync_log").insert({ game, synced_at: new Date().toISOString(), draws_found: rows.length });

  return { inserted: count || 0, total: rows.length };
}

export default async function handler(req, res) {
  // Security: only allow requests with the correct cron secret
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const results = {};
  const errors = {};

  // Determine which games to scrape (query param or all)
  const gameFilter = req.query.game;
  const gamesToScrape = gameFilter
    ? { [gameFilter]: GAME_URLS[gameFilter] }
    : GAME_URLS;

  for (const [game, url] of Object.entries(gamesToScrape)) {
    try {
      console.log(`Scraping ${game}...`);
      const { draws } = await scrapeGame(game, url);
      const result = await saveDraws(game, draws);
      results[game] = result;
      console.log(`${game}: saved ${result.inserted} new draws (${result.total} found)`);
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

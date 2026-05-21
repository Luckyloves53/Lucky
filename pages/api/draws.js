// pages/api/draws.js
// Returns lottery draws from Supabase database
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { game = "6/58", limit = 200 } = req.query;

  try {
    const { data, error } = await supabase
      .from("draws")
      .select("draw_date, numbers, game")
      .eq("game", game)
      .order("draw_date", { ascending: false })
      .limit(Number(limit));

    if (error) throw error;

    // Get last sync time
    const { data: syncData } = await supabase
      .from("sync_log")
      .select("synced_at")
      .eq("game", game)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    res.status(200).json({
      draws: data || [],
      lastSync: syncData?.synced_at || null,
      count: data?.length || 0,
    });
  } catch (err) {
    console.error("draws API error:", err);
    res.status(500).json({ error: err.message, draws: [] });
  }
}

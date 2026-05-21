// pages/api/analyze.js
// Uses Anthropic API to analyze the user's picked lottery numbers

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { game, picked, ranks, hot6, cold6, totalDraws } = req.body;

  const prompt = `You are a fun PCSO lottery analyst for the Philippine ${game} lottery.

A player picked these 6 numbers: ${picked.join(", ")}

Based on the last ${totalDraws} draws:
${ranks.map(r => `- Number ${r.n}: rank #${r.rank}, appeared ${r.f} times`).join("\n")}

Top 6 hottest numbers: ${hot6.join(", ")}
Top 6 coldest numbers: ${cold6.join(", ")}

Give a SHORT, fun, engaging analysis (3-4 sentences max). 
Rate their hot-number strategy score out of 10.
Be playful and encouraging but also honest that lottery is random.
End with a fun Filipino encouragement like "Sana manalo ka!" or "Swerte ka ngayon!"`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const analysis = data.content?.map(c => c.text || "").join("") || "Analysis unavailable.";
    res.status(200).json({ analysis });
  } catch (err) {
    console.error("analyze API error:", err);
    res.status(500).json({ analysis: "AI offline. Sana manalo ka anyway! 🍀" });
  }
}

// pages/api/analyze.js
// Free version - no Anthropic API needed
// Analyzes picks using pure statistics

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { picked, ranks, hot6, cold6, totalDraws } = req.body;

  // Calculate strategy score based on how many hot numbers they picked
  const hotPicks = picked.filter(n => hot6.includes(n)).length;
  const coldPicks = picked.filter(n => cold6.includes(n)).length;
  const score = Math.round((hotPicks / 6) * 10);

  // Average rank of picked numbers
  const avgRank = Math.round(ranks.reduce((a, b) => a + b.rank, 0) / ranks.length);

  // Generate analysis message
  let message = "";
  let emoji = "";

  if (hotPicks === 6) {
    emoji = "🔥🔥🔥";
    message = `Grabe! All 6 numbers are in the hottest list! Maximum hot strategy score — ${score}/10. You went all-in on the frequent numbers. Mathematically bold, historically popular. Sana manalo ka!`;
  } else if (hotPicks >= 4) {
    emoji = "🔥🔥";
    message = `Solid combination! ${hotPicks} out of 6 numbers are among the most frequent draws. Hot strategy score: ${score}/10. Your average frequency rank is #${avgRank} out of ${totalDraws} draws analyzed. Swerte ka ngayon!`;
  } else if (hotPicks >= 2) {
    emoji = "⚖️";
    message = `Balanced combination! You mixed ${hotPicks} hot and ${coldPicks} cold numbers. Hot strategy score: ${score}/10. A balanced approach — some people swear by mixing hot and cold. Maswerte ka sana!`;
  } else if (coldPicks >= 4) {
    emoji = "❄️❄️";
    message = `Interesting cold strategy! ${coldPicks} of your numbers are among the least frequent. Score: ${score}/10. Some players believe cold numbers are "due" to appear — the contrarian approach! Sana mag-appear na sila!`;
  } else {
    emoji = "🎲";
    message = `Random-ish combination with an average frequency rank of #${avgRank}. Hot strategy score: ${score}/10. Sometimes the universe just picks for you! Bahala na si Lord!`;
  }

  res.status(200).json({
    analysis: `${emoji} ${message}`,
    score,
    hotPicks,
    coldPicks,
  });
}

import { useState, useEffect } from "react";
import Head from "next/head";

const GAMES = {
  "6/58": { max: 58, name: "Ultra Lotto 6/58", schedule: "Tue, Fri, Sun" },
  "6/55": { max: 55, name: "Grand Lotto 6/55", schedule: "Mon, Wed, Sat" },
  "6/49": { max: 49, name: "Super Lotto 6/49", schedule: "Tue, Thu, Sun" },
  "6/45": { max: 45, name: "Mega Lotto 6/45", schedule: "Mon, Wed, Fri" },
  "6/42": { max: 42, name: "Lotto 6/42",       schedule: "Tue, Thu, Sat" },
};

function computeFrequency(draws, max) {
  const freq = {};
  for (let i = 1; i <= max; i++) freq[i] = 0;
  draws.forEach(d => d.numbers.forEach(n => { if (freq[n] !== undefined) freq[n]++; }));
  return freq;
}

function getColor(heat) {
  if (heat > 0.8) return "#ff3333";
  if (heat > 0.6) return "#ff8800";
  if (heat > 0.4) return "#ffcc00";
  if (heat > 0.2) return "#44aaff";
  return "#2a3f66";
}

export default function Home() {
  const [game, setGame]           = useState("6/58");
  const [draws, setDraws]         = useState([]);
  const [range, setRange]         = useState(30);
  const [lastSync, setLastSync]   = useState(null);
  const [loading, setLoading]     = useState(true);
  const [picked, setPicked]       = useState([]);
  const [analysis, setAnalysis]   = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [tab, setTab]             = useState("picker");

  useEffect(() => {
    setPicked([]); setAnalysis(""); fetchDraws();
  }, [game]);

  async function fetchDraws() {
    setLoading(true);
    try {
      const res = await fetch(`/api/draws?game=${encodeURIComponent(game)}&limit=200`);
      const data = await res.json();
      setDraws(data.draws || []);
      setLastSync(data.lastSync || null);
    } catch { setDraws([]); }
    setLoading(false);
  }

  const slice   = draws.slice(0, range);
  const max     = GAMES[game].max;
  const freq    = computeFrequency(slice, max);
  const sorted  = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const maxFreq = Math.max(...Object.values(freq), 1);
  const minFreq = Math.min(...Object.values(freq));
  const getHeat = n => (freq[n] - minFreq) / Math.max(maxFreq - minFreq, 1);
  const hot6    = sorted.slice(0, 6).map(([n]) => +n);
  const cold6   = sorted.slice(-6).map(([n]) => +n);

  function toggle(n) {
    if (picked.includes(n)) setPicked(picked.filter(x => x !== n));
    else if (picked.length < 6) setPicked([...picked, n].sort((a, b) => a - b));
  }

  async function analyze() {
    if (picked.length !== 6) return;
    setAnalyzing(true); setAnalysis("");
    const ranks = picked.map(n => ({ n, rank: sorted.findIndex(([x]) => +x === n) + 1, f: freq[n] }));
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, picked, ranks, hot6, cold6, totalDraws: slice.length }),
      });
      const d = await res.json();
      setAnalysis(d.analysis || "No analysis returned.");
    } catch { setAnalysis("Could not connect to AI. Sana manalo ka anyway! 🍀"); }
    setAnalyzing(false);
  }

  return (
    <>
      <Head>
        <title>PCSO Hot Numbers 🎱</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="app">
        {/* Header */}
        <header>
          <div className="logo">🎱</div>
          <h1>PCSO Hot Numbers</h1>
          <p className="sub">Live data from PCSO • Philippines 🇵🇭</p>
        </header>

        {/* Game selector */}
        <div className="game-tabs">
          {Object.keys(GAMES).map(g => (
            <button key={g} className={`game-tab ${game === g ? "active" : ""}`} onClick={() => setGame(g)}>{g}</button>
          ))}
        </div>

        {/* Status */}
        <div className="status-bar">
          <span>{loading ? "⏳ Loading..." : `✅ ${slice.length} draws • Last sync: ${lastSync ? new Date(lastSync).toLocaleString("en-PH") : "—"}`}</span>
          <button className="refresh-btn" onClick={fetchDraws} disabled={loading}>🔄</button>
        </div>

        {/* Range pills */}
        <div className="range-pills">
          {[10, 20, 30, 50, 100, 200].map(r => (
            <button key={r} className={`pill ${range === r ? "active" : ""}`} onClick={() => setRange(r)}>Last {r}</button>
          ))}
        </div>

        {/* Tabs */}
        <div className="view-tabs">
          {["picker", "heatmap", "history"].map(t => (
            <button key={t} className={`view-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
              {t === "picker" ? "🎯 Pick" : t === "heatmap" ? "🔥 Heat Map" : "📋 History"}
            </button>
          ))}
        </div>

        {/* PICKER TAB */}
        {tab === "picker" && !loading && (
          <div className="picker-view">
            <div className="hot-cold-row">
              <div className="hot-box">
                <div className="box-label">🔥 Hottest</div>
                <div className="ball-row">
                  {hot6.map(n => <div key={n} className={`ball hot ${picked.includes(n) ? "picked" : ""}`} onClick={() => toggle(n)}>{n}</div>)}
                </div>
              </div>
              <div className="cold-box">
                <div className="box-label">❄️ Coldest</div>
                <div className="ball-row">
                  {cold6.map(n => <div key={n} className={`ball cold ${picked.includes(n) ? "picked" : ""}`} onClick={() => toggle(n)}>{n}</div>)}
                </div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: `repeat(${max <= 45 ? 7 : 8}, 1fr)` }}>
              {Array.from({ length: max }, (_, i) => i + 1).map(n => {
                const heat = getHeat(n);
                const color = getColor(heat);
                const isPicked = picked.includes(n);
                return (
                  <button key={n} className="grid-ball" onClick={() => toggle(n)}
                    style={{
                      "--c": color,
                      background: isPicked ? color : `${color}22`,
                      border: isPicked ? `2px solid ${color}` : `1px solid ${color}55`,
                      color: isPicked ? "#000" : color,
                      transform: isPicked ? "scale(1.15)" : "scale(1)",
                      boxShadow: isPicked ? `0 0 10px ${color}88` : "none",
                    }}>{n}</button>
                );
              })}
            </div>

            <div className="action-row">
              <button className="btn-hot" onClick={() => setPicked(hot6)}>🔥 Auto Hot</button>
              <button className="btn-rnd" onClick={() => {
                const a = Array.from({ length: max }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
                setPicked(a.slice(0, 6).sort((a, b) => a - b));
              }}>🎲 Random</button>
              <button className="btn-clr" onClick={() => { setPicked([]); setAnalysis(""); }}>✕</button>
            </div>

            <div className={`combo-display ${picked.length === 6 ? "ready" : ""}`}>
              <div className="combo-label">YOUR COMBO ({picked.length}/6)</div>
              <div className="combo-balls">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={`combo-ball ${picked[i] ? "filled" : "empty"}`}>{picked[i] || ""}</div>
                ))}
              </div>
            </div>

            <button className="analyze-btn" onClick={analyze} disabled={picked.length !== 6 || analyzing}>
              {analyzing ? "🤖 Analyzing..." : picked.length === 6 ? "🤖 AI Analyze My Numbers" : `Pick ${6 - picked.length} more number${6 - picked.length !== 1 ? "s" : ""}`}
            </button>

            {analysis && (
              <div className="analysis-box">
                <div className="analysis-label">🤖 AI ANALYSIS</div>
                <p>{analysis}</p>
              </div>
            )}
          </div>
        )}

        {/* HEATMAP TAB */}
        {tab === "heatmap" && !loading && (
          <div className="heatmap-view">
            <div className="legend">
              {[["🔴 Hot", "#ff3333"], ["🟠 Warm", "#ff8800"], ["🟡 Avg", "#ffcc00"], ["🔵 Cool", "#44aaff"], ["⚫ Cold", "#2a3f66"]].map(([l, c]) => (
                <span key={l} style={{ color: c, fontSize: 11 }}>{l}</span>
              ))}
            </div>
            <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${max <= 45 ? 7 : 8}, 1fr)` }}>
              {Array.from({ length: max }, (_, i) => i + 1).map(n => {
                const color = getColor(getHeat(n));
                return (
                  <div key={n} className="heat-cell" style={{ background: `${color}28`, border: `1px solid ${color}55` }}>
                    <div style={{ fontSize: 10, fontWeight: "bold", color }}>{n}</div>
                    <div style={{ fontSize: 8, color: `${color}99` }}>{freq[n]}x</div>
                  </div>
                );
              })}
            </div>
            <div className="top10">
              <div className="top10-label">📊 Top 10 Most Frequent</div>
              {sorted.slice(0, 10).map(([n, f], i) => {
                const color = getColor(getHeat(+n));
                return (
                  <div key={n} className="top10-row">
                    <span className="rank">#{i + 1}</span>
                    <div className="top10-ball" style={{ background: color, color: "#000" }}>{n}</div>
                    <div className="bar-wrap">
                      <div className="bar-fill" style={{ width: `${((f - minFreq) / Math.max(maxFreq - minFreq, 1)) * 100}%`, background: color }} />
                    </div>
                    <span className="bar-count">{f}x</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {tab === "history" && !loading && (
          <div className="history-view">
            <p className="history-meta">{draws.length} draws on record for {GAMES[game].name}</p>
            <div className="history-list">
              {draws.slice(0, 60).map((d, i) => (
                <div key={i} className={`history-row ${i % 2 === 0 ? "even" : ""}`}>
                  <span className="draw-date">{d.draw_date ? new Date(d.draw_date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : `Draw ${draws.length - i}`}</span>
                  <div className="draw-balls">
                    {[...d.numbers].sort((a, b) => a - b).map((n, j) => {
                      const color = getColor(getHeat(n));
                      return <div key={j} className="hist-ball" style={{ background: `${color}22`, border: `1px solid ${color}66`, color }}>{n}</div>;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer>
          Data sourced from lottopcso.com • For entertainment only • Play responsibly 18+ 🇵🇭
        </footer>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080818; color: #dde8ff; font-family: 'Outfit', sans-serif; }
        .app { max-width: 480px; margin: 0 auto; padding: 16px; min-height: 100vh; }

        header { text-align: center; margin-bottom: 18px; }
        .logo { font-size: 36px; }
        h1 { font-size: 22px; font-weight: 700; background: linear-gradient(90deg,#ffd700,#ff8800,#ffd700); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .sub { font-size: 12px; color: #5566aa; margin-top: 2px; }

        .game-tabs { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-bottom: 12px; }
        .game-tab { padding: 6px 13px; border-radius: 20px; border: 1px solid #223355; background: rgba(255,255,255,0.03); color: #5566aa; font-size: 12px; cursor: pointer; font-family: inherit; }
        .game-tab.active { border: 2px solid #ffd700; background: rgba(255,215,0,0.1); color: #ffd700; font-weight: 700; }

        .status-bar { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid #1a2a44; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; font-size: 11px; color: #5577aa; }
        .refresh-btn { background: rgba(68,119,255,0.2); border: 1px solid #334488; color: #88aaff; border-radius: 8px; padding: 3px 10px; cursor: pointer; font-size: 13px; font-family: inherit; }

        .range-pills { display: flex; gap: 5px; justify-content: center; flex-wrap: wrap; margin-bottom: 12px; }
        .pill { padding: 4px 10px; border-radius: 8px; border: 1px solid #223; background: rgba(255,255,255,0.02); color: #445566; font-size: 11px; cursor: pointer; font-family: inherit; }
        .pill.active { border-color: #ffd700; background: rgba(255,215,0,0.1); color: #ffd700; }

        .view-tabs { display: flex; gap: 6px; margin-bottom: 14px; }
        .view-tab { flex: 1; padding: 8px; border-radius: 10px; border: 1px solid #1a2444; background: rgba(255,255,255,0.02); color: #334466; font-size: 12px; cursor: pointer; font-family: inherit; }
        .view-tab.active { border-color: #4466ff; background: rgba(68,102,255,0.15); color: #8899ff; font-weight: 700; }

        .hot-cold-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .hot-box, .cold-box { flex: 1; border-radius: 10px; padding: 10px; }
        .hot-box { background: rgba(255,50,50,0.07); border: 1px solid rgba(255,50,50,0.2); }
        .cold-box { background: rgba(40,100,255,0.07); border: 1px solid rgba(40,100,255,0.18); }
        .box-label { font-size: 10px; font-weight: 700; margin-bottom: 7px; }
        .hot-box .box-label { color: #ff6666; }
        .cold-box .box-label { color: #5588ff; }
        .ball-row { display: flex; flex-wrap: wrap; gap: 4px; }
        .ball { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.12s; }
        .ball.hot { background: rgba(255,50,50,0.18); border: 1px solid rgba(255,50,50,0.3); color: #ffaaaa; }
        .ball.hot.picked { background: #ff3333; border: 2px solid #ff7777; box-shadow: 0 0 8px #ff333388; }
        .ball.cold { background: rgba(40,100,255,0.1); border: 1px solid rgba(40,100,255,0.25); color: #8899ff; }
        .ball.cold.picked { background: #3355ff; border: 2px solid #7799ff; }

        .grid { display: grid; gap: 5px; margin-bottom: 12px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 10px; border: 1px solid #0d1a30; }
        .grid-ball { aspect-ratio: 1; border-radius: 50%; font-size: 10px; font-weight: 700; cursor: pointer; transition: all 0.12s; font-family: inherit; padding: 0; }

        .action-row { display: flex; gap: 8px; margin-bottom: 12px; }
        .btn-hot { flex: 1; padding: 10px; border-radius: 10px; background: linear-gradient(135deg,#cc2200,#ff6600); border: none; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
        .btn-rnd { flex: 1; padding: 10px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid #223; color: #889; font-size: 12px; cursor: pointer; font-family: inherit; }
        .btn-clr { padding: 10px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid #1a2; color: #445; font-size: 12px; cursor: pointer; font-family: inherit; }

        .combo-display { background: rgba(255,215,0,0.04); border: 1px solid #0d1a30; border-radius: 12px; padding: 12px; margin-bottom: 12px; transition: border-color 0.3s; }
        .combo-display.ready { border-color: rgba(255,215,0,0.3); }
        .combo-label { font-size: 10px; color: #667799; margin-bottom: 8px; }
        .combo-balls { display: flex; gap: 8px; justify-content: center; }
        .combo-ball { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; transition: all 0.2s; }
        .combo-ball.filled { background: linear-gradient(135deg,#ffd700,#ff8800); color: #000; box-shadow: 0 2px 10px rgba(255,215,0,0.35); }
        .combo-ball.empty { background: rgba(255,255,255,0.03); border: 2px dashed #1a2a44; color: #1a2a44; }

        .analyze-btn { width: 100%; padding: 13px; border-radius: 12px; border: none; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; background: rgba(255,255,255,0.03); color: #223; }
        .analyze-btn:not(:disabled) { background: linear-gradient(135deg,#3344ee,#7733dd); color: #fff; box-shadow: 0 3px 16px rgba(80,60,255,0.3); }

        .analysis-box { margin-top: 14px; background: rgba(80,60,255,0.08); border: 1px solid rgba(80,60,255,0.25); border-radius: 12px; padding: 14px; }
        .analysis-label { font-size: 10px; color: #7788ff; font-weight: 700; margin-bottom: 8px; }
        .analysis-box p { font-size: 13px; line-height: 1.7; color: #bbc8ff; }

        .legend { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-bottom: 10px; }
        .heatmap-grid { display: grid; gap: 5px; background: rgba(255,255,255,0.02); border-radius: 12px; padding: 10px; }
        .heat-cell { aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }

        .top10 { margin-top: 14px; background: rgba(255,255,255,0.02); border-radius: 10px; padding: 12px; }
        .top10-label { font-size: 10px; color: #667799; font-weight: 700; margin-bottom: 10px; }
        .top10-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .rank { width: 20px; font-size: 9px; color: #334; text-align: right; }
        .top10-ball { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; flex-shrink: 0; }
        .bar-wrap { flex: 1; height: 5px; border-radius: 3px; background: #0a1020; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 3px; }
        .bar-count { font-size: 9px; color: #445; width: 28px; text-align: right; }

        .history-meta { font-size: 11px; color: #667799; text-align: center; margin-bottom: 10px; }
        .history-list { max-height: 500px; overflow-y: auto; }
        .history-row { display: flex; align-items: center; gap: 8px; padding: 7px 8px; border-radius: 8px; }
        .history-row.even { background: rgba(255,255,255,0.02); }
        .draw-date { font-size: 9px; color: #334455; width: 70px; flex-shrink: 0; }
        .draw-balls { display: flex; gap: 4px; }
        .hist-ball { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }

        footer { text-align: center; font-size: 9px; color: #223344; margin-top: 20px; padding: 10px; line-height: 1.6; }
      `}</style>
    </>
  );
}

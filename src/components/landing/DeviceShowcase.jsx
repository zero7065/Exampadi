// Animated device showcase: a phone auto-solving demo questions
// (timer ticks, option picked, correct flashes, XP pops). Loops forever.
import { useEffect, useState } from "react";

const DEMO = [
  {
    tag: "PHYSICS · Q7/40",
    q: "A body of mass 5kg has momentum 20kg·m/s. Its velocity is…",
    options: ["2 m/s", "4 m/s", "10 m/s", "100 m/s"],
    answer: 1,
    why: "v = p/m = 20/5 = 4 m/s",
  },
  {
    tag: "ENGLISH · Q12/40",
    q: "Choose the word nearest in meaning to “candid”:",
    options: ["Rude", "Frank", "Clever", "Timid"],
    answer: 1,
    why: "Candid = truthful and straightforward.",
  },
  {
    tag: "MATHS · Q3/40",
    q: "Solve: 2x + 5 = 15",
    options: ["x = 4", "x = 5", "x = 10", "x = 7.5"],
    answer: 1,
    why: "2x = 10, so x = 5.",
  },
];

// Realistic UTME timer: 2 hours = 7200 seconds
const INITIAL_SECONDS = 2 * 60 * 60; // 7200 = 02:00:00

export default function DeviceShowcase() {
  const [qi, setQi] = useState(0);
  const [phase, setPhase] = useState(0); // 0 reading, 1 picked, 2 solved
  const [secs, setSecs] = useState(INITIAL_SECONDS);
  const [xp, setXp] = useState(2840);

  useEffect(() => {
    const t = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : s)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 2200);
    const t2 = setTimeout(() => {
      setPhase(2);
      setXp((x) => x + 10);
    }, 3400);
    const t3 = setTimeout(() => {
      setQi((q) => (q + 1) % DEMO.length);
      setPhase(0);
    }, 6200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [qi]);

  const d = DEMO[qi];
  const hh = String(Math.floor(secs / 3600)).padStart(2, "0");
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div style={{ position: "relative", width: "fit-content", margin: "0 auto" }}>
      {/* glow + ripple behind device */}
      <div style={{
        position: "absolute", inset: -30, borderRadius: 48, zIndex: 0,
        background: "radial-gradient(circle, rgb(var(--primary-rgb) / 0.22) 0%, transparent 70%)",
      }} />
      <div className="lp-phone lp-animate-in" style={{ position: "relative", zIndex: 1 }}>
        <div className="lp-phone-notch" />
        {/* status bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)" }}>● LIVE DEMO</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{hh}:{mm}:{ss}</span>
        </div>
        <div style={{ background: "var(--landing-gradient)", borderRadius: 14, padding: 14, color: "#fff", marginBottom: 12, minHeight: 108 }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600 }}>{d.tag}</div>
          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, lineHeight: 1.5 }}>{d.q}</div>
        </div>
        {d.options.map((o, i) => {
          const picked = phase >= 1 && i === d.answer;
          const solved = phase === 2 && i === d.answer;
          return (
            <div key={`${qi}-${o}`} style={{
              borderRadius: 10, padding: 10, fontSize: 12, fontWeight: 600, marginBottom: 8,
              background: solved ? "rgb(var(--success-rgb) / 0.18)" : picked ? "rgb(var(--primary-rgb) / 0.16)" : "var(--bg-2)",
              border: solved ? "1px solid var(--success)" : picked ? "1px solid var(--primary)" : "1px solid var(--border)",
              color: "var(--text)",
              transform: picked ? "scale(1.02)" : "scale(1)",
              transition: "all 0.3s ease",
            }}>
              {o} {solved ? "✓" : ""}
            </div>
          );
        })}
        <div style={{
          marginTop: 10, borderRadius: 10, padding: 10, fontSize: 11, lineHeight: 1.5,
          background: "rgb(var(--primary-rgb) / 0.08)", border: "1px dashed rgb(var(--primary-rgb) / 0.4)",
          color: "var(--text-muted)",
          opacity: phase === 2 ? 1 : 0, transform: phase === 2 ? "none" : "translateY(6px)",
          transition: "all 0.4s ease", minHeight: 52,
        }}>
          {phase === 2 ? <><strong style={{ color: "var(--primary)" }}>AI explains:</strong> {d.why}</> : " "}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ width: `${((qi + (phase === 2 ? 1 : 0)) / DEMO.length) * 100}%`, height: "100%", background: "var(--primary)", transition: "width 0.5s ease" }} />
          </div>
          <span key={xp} className="xp-pop" style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)", whiteSpace: "nowrap" }}>⚡ {xp.toLocaleString()} XP</span>
        </div>
      </div>
      <style>{`
        @keyframes xpPop { 0% { transform: scale(1); } 40% { transform: scale(1.25); } 100% { transform: scale(1); } }
        .xp-pop { animation: xpPop 0.5s ease; }
        @media (prefers-reduced-motion: reduce) { .xp-pop { animation: none; } }
      `}</style>
    </div>
  );
}

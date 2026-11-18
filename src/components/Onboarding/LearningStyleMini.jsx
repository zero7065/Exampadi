/* eslint-disable react-refresh/only-export-components */
// LearningStyleMini — 3-question quiz that detects the student's preferred
// learning style. Shown once during onboarding; changeable in Settings.
import { useState } from "react";
import { ChevronRight } from "lucide-react";

export const LEARNING_STYLES = [
  { id: "visual", label: "Visual", emoji: "📊", desc: "Diagrams & pictures" },
  { id: "verbal", label: "Reading", emoji: "📖", desc: "Clear explanations" },
  { id: "example", label: "Examples", emoji: "🔢", desc: "Worked examples first" },
  { id: "step-by-step", label: "Step-by-step", emoji: "🪜", desc: "Small guided steps" },
];

const QUESTIONS = [
  {
    q: "When you're stuck on a topic, you prefer…",
    options: [
      { style: "visual", label: "📊 A diagram or picture" },
      { style: "verbal", label: "📖 A clear explanation" },
      { style: "example", label: "🔢 A worked example" },
      { style: "step-by-step", label: "🪜 Small steps to follow" },
    ],
  },
  {
    q: "You remember things best when you…",
    options: [
      { style: "visual", label: "👀 See it drawn out" },
      { style: "verbal", label: "📝 Read it in your own words" },
      { style: "example", label: "💪 Do a similar example" },
      { style: "step-by-step", label: "🧩 Break it into parts" },
    ],
  },
  {
    q: "For a hard problem, what helps most?",
    options: [
      { style: "step-by-step", label: "🪜 Breaking it down" },
      { style: "example", label: "🔁 An analogy or example" },
      { style: "visual", label: "🎨 Drawing it out" },
      { style: "verbal", label: "💬 Talking it through" },
    ],
  },
];

export function detectStyle(answers) {
  const counts = {};
  for (const a of answers) counts[a] = (counts[a] || 0) + 1;
  let best = "step-by-step";
  let bestN = -1;
  for (const s of LEARNING_STYLES) {
    if ((counts[s.id] || 0) > bestN) {
      bestN = counts[s.id] || 0;
      best = s.id;
    }
  }
  return best;
}

export default function LearningStyleMini({ onDone, onSkip }) {
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState([]);

  function choose(style) {
    const next = [...answers, style];
    if (qi + 1 < QUESTIONS.length) {
      setAnswers(next);
      setQi(qi + 1);
    } else {
      onDone(detectStyle(next));
    }
  }

  const q = QUESTIONS[qi];

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", marginBottom: 8 }}>
          QUESTION {qi + 1} OF {QUESTIONS.length} · HOW DO YOU LEARN BEST?
        </div>
        <h2 style={{ color: "var(--text)", fontSize: 22, fontWeight: 800, margin: 0 }}>{q.q}</h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        {q.options.map((o) => (
          <button
            key={o.style + o.label}
            onClick={() => choose(o.style)}
            style={{
              padding: "14px 18px", borderRadius: 12, textAlign: "left",
              background: "var(--bg-2)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            {o.label}
            <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {QUESTIONS.map((_, i) => (
          <div key={i} style={{
            width: 28, height: 4, borderRadius: 2,
            background: i <= qi ? "var(--primary)" : "var(--border)",
          }} />
        ))}
      </div>
      {onSkip && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" }}>
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}

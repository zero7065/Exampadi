// Short educational clips — looping SVG micro-lessons that teach real concepts.
// Each clip: animated diagram + one-line takeaway. Pure SVG/CSS, zero load.
import { useState, useEffect, useRef } from "react";
import { BookOpen, Pause, Play } from "lucide-react";

// ── Clip 1: Photosynthesis ──
function PhotosynthesisClip() {
  return (
    <svg viewBox="0 0 300 180" width="100%" style={{ display: "block", borderRadius: 10 }} role="img" aria-label="Photosynthesis animation">
      <rect width="300" height="180" rx="10" fill="#0B1F16" />
      {/* sun */}
      <circle cx="250" cy="40" r="22" fill="#FFD54F" className="ps-sun" />
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1="250" y1="40" x2={250 + Math.cos((i * Math.PI) / 4) * 32} y2={40 + Math.sin((i * Math.PI) / 4) * 32}
          stroke="#FFD54F" strokeWidth="2" opacity="0.6" className="ps-ray" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
      {/* leaf */}
      <g className="ps-leaf" style={{ transformOrigin: "130px 120px" }}>
        <path d="M130 60 Q80 120 130 160 Q180 120 130 60 Z" fill="#2E7D32" stroke="#4ADE80" strokeWidth="2" />
        <line x1="130" y1="70" x2="130" y2="150" stroke="#4ADE80" strokeWidth="1.5" />
      </g>
      {/* CO2 in */}
      <text x="40" y="100" fontSize="11" fill="#90CAF9" className="ps-co2" fontFamily="monospace">CO₂ →</text>
      {/* O2 out */}
      <text x="220" y="130" fontSize="11" fill="#80DEEA" className="ps-o2" fontFamily="monospace">→ O₂</text>
      {/* H2O */}
      <text x="40" y="140" fontSize="11" fill="#64B5F6" className="ps-h2o" fontFamily="monospace">H₂O →</text>
      <text x="130" y="176" fontSize="9" fill="#A5D6A7" textAnchor="middle" className="ps-label">Light + CO₂ + H₂O → Glucose + O₂</text>
      <style>{`
        .ps-sun { animation: psSun 4s ease-in-out infinite; transform-origin: 250px 40px; }
        @keyframes psSun { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        .ps-ray { animation: psRay 3s linear infinite; }
        @keyframes psRay { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
        .ps-leaf { animation: psLeaf 4s ease-in-out infinite; }
        @keyframes psLeaf { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .ps-co2 { animation: psIn 3s linear infinite; }
        .ps-h2o { animation: psIn 3s linear infinite; animation-delay: 0.5s; }
        @keyframes psIn { 0% { opacity: 0; transform: translateX(-10px); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateX(20px); } }
        .ps-o2 { animation: psOut 3s linear infinite; }
        @keyframes psOut { 0% { opacity: 0; transform: translateX(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: translateX(30px); } }
        .ps-label { opacity: 0.75; }
      `}</style>
    </svg>
  );
}

// ── Clip 2: Pythagoras ──
function PythagorasClip() {
  return (
    <svg viewBox="0 0 300 180" width="100%" style={{ display: "block", borderRadius: 10 }} role="img" aria-label="Pythagorean theorem animation">
      <rect width="300" height="180" rx="10" fill="#0D1B2A" />
      {/* triangle */}
      <g className="py-tri">
        <polygon points="80,140 80,60 220,140" fill="rgb(var(--primary-rgb) / 0.15)" stroke="var(--primary)" strokeWidth="2" />
        {/* squares on sides */}
        <rect x="50" y="60" width="30" height="80" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4" className="py-sq1" />
        <rect x="80" y="145" width="140" height="20" fill="none" stroke="var(--success)" strokeWidth="1.5" strokeDasharray="4" className="py-sq2" />
        <text x="30" y="105" fontSize="12" fill="var(--accent)" fontFamily="monospace" className="py-a">a</text>
        <text x="145" y="170" fontSize="12" fill="var(--success)" fontFamily="monospace" className="py-b">b</text>
        <text x="160" y="95" fontSize="12" fill="var(--primary)" fontFamily="monospace" className="py-c">c</text>
      </g>
      <text x="150" y="30" fontSize="13" fontWeight="800" fill="#fff" textAnchor="middle" className="py-formula">a² + b² = c²</text>
      <text x="150" y="46" fontSize="9" fill="var(--text-muted)" textAnchor="middle">3² + 4² = 5² → 9 + 16 = 25</text>
      <style>{`
        .py-tri { animation: pyPulse 4s ease-in-out infinite; transform-origin: 150px 100px; }
        @keyframes pyPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }
        .py-formula { animation: pyGlow 3s ease-in-out infinite; }
        @keyframes pyGlow { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        .py-a, .py-b, .py-c { animation: pyBlink 3s ease-in-out infinite; }
        .py-b { animation-delay: 0.3s; }
        .py-c { animation-delay: 0.6s; }
        @keyframes pyBlink { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </svg>
  );
}

// ── Clip 3: Newton's Third Law ──
function NewtonClip() {
  return (
    <svg viewBox="0 0 300 180" width="100%" style={{ display: "block", borderRadius: 10 }} role="img" aria-label="Newton's third law animation">
      <rect width="300" height="180" rx="10" fill="#1A0A2E" />
      {/* rocket */}
      <g className="nw-rocket" style={{ transformOrigin: "150px 100px" }}>
        <rect x="138" y="70" width="24" height="40" rx="8" fill="#E0E0E0" stroke="var(--primary)" strokeWidth="1.5" />
        <polygon points="138,70 150,54 162,70" fill="var(--danger)" />
        <circle cx="150" cy="88" r="5" fill="#4FC3F7" />
        {/* flame */}
        <g className="nw-flame">
          <path d="M144 110 Q150 135 156 110 Z" fill="#FF9800" />
          <path d="M147 110 Q150 125 153 110 Z" fill="#FFEB3B" />
        </g>
      </g>
      {/* action/reaction arrows */}
      <g className="nw-arrow1">
        <line x1="150" y1="140" x2="150" y2="165" stroke="#FF7043" strokeWidth="2" markerEnd="url(#nwArrow)" />
      </g>
      <defs>
        <marker id="nwArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#FF7043" />
        </marker>
      </defs>
      <text x="150" y="178" fontSize="9" fill="#FFAB91" textAnchor="middle" className="nw-lbl1">Action (gas pushed down)</text>
      <text x="150" y="30" fontSize="9" fill="#90CAF9" textAnchor="middle" className="nw-lbl2">Reaction (rocket pushed up)</text>
      <style>{`
        .nw-rocket { animation: nwRise 3s ease-in-out infinite; }
        @keyframes nwRise { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .nw-flame { animation: nwFlicker 0.3s ease-in-out infinite; transform-origin: 150px 110px; }
        @keyframes nwFlicker { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.3); } }
        .nw-arrow1 { animation: nwArrow 1.5s ease-in-out infinite; }
        @keyframes nwArrow { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        .nw-lbl1, .nw-lbl2 { opacity: 0.75; }
      `}</style>
    </svg>
  );
}

// ── Clip 4: Water Cycle ──
function WaterCycleClip() {
  return (
    <svg viewBox="0 0 300 180" width="100%" style={{ display: "block", borderRadius: 10 }} role="img" aria-label="Water cycle animation">
      <rect width="300" height="180" rx="10" fill="#0A1929" />
      {/* sun */}
      <circle cx="250" cy="35" r="16" fill="#FFD54F" opacity="0.8" className="wc-sun" />
      {/* sea */}
      <rect x="0" y="130" width="300" height="50" fill="#1565C0" opacity="0.6" />
      <path d="M0 130 Q30 122 60 130 T120 130 T180 130 T240 130 T300 130 V180 H0 Z" fill="#1976D2" opacity="0.5" className="wc-wave" />
      {/* evaporation arrows */}
      {[60, 120, 180].map((x, i) => (
        <path key={i} d={`M${x} 125 Q${x - 8} 100 ${x} 80`} stroke="#90CAF9" strokeWidth="1.5" fill="none" strokeDasharray="3" className="wc-evap" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
      {/* cloud */}
      <g className="wc-cloud" style={{ transformOrigin: "150px 55px" }}>
        <ellipse cx="130" cy="55" rx="24" ry="14" fill="#CFD8DC" opacity="0.9" />
        <ellipse cx="155" cy="50" rx="28" ry="16" fill="#ECEFF1" opacity="0.9" />
        <ellipse cx="178" cy="56" rx="20" ry="12" fill="#CFD8DC" opacity="0.9" />
      </g>
      {/* rain */}
      {[130, 150, 170].map((x, i) => (
        <line key={i} x1={x} y1="70" x2={x} y2="88" stroke="#64B5F6" strokeWidth="2" className="wc-rain" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      <text x="150" y="172" fontSize="9" fill="#90CAF9" textAnchor="middle" className="wc-lbl">Evaporation → Condensation → Precipitation</text>
      <style>{`
        .wc-sun { animation: wcSun 4s ease-in-out infinite; transform-origin: 250px 35px; }
        @keyframes wcSun { 0%,100% { transform: scale(1); } 50% { transform: scale(1.15); } }
        .wc-wave { animation: wcWave 4s ease-in-out infinite; }
        @keyframes wcWave { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-10px); } }
        .wc-evap { animation: wcEvap 3s linear infinite; }
        @keyframes wcEvap { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 1; } 100% { opacity: 0; transform: translateY(-50px); } }
        .wc-cloud { animation: wcCloud 6s ease-in-out infinite; }
        @keyframes wcCloud { 0%,100% { transform: translateX(0); } 50% { transform: translateX(12px); } }
        .wc-rain { animation: wcRain 1s linear infinite; }
        @keyframes wcRain { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 1; } 100% { opacity: 0; transform: translateY(20px); } }
        .wc-lbl { opacity: 0.75; }
      `}</style>
    </svg>
  );
}

const CLIPS = [
  { id: "photosynthesis", title: "Photosynthesis", clip: PhotosynthesisClip, tag: "Biology", takeaway: "Plants turn light, CO₂ and water into glucose + oxygen." },
  { id: "pythagoras", title: "Pythagoras Theorem", clip: PythagorasClip, tag: "Mathematics", takeaway: "In a right triangle: a² + b² = c²." },
  { id: "newton", title: "Newton's 3rd Law", clip: NewtonClip, tag: "Physics", takeaway: "Every action has an equal and opposite reaction." },
  { id: "watercycle", title: "Water Cycle", clip: WaterCycleClip, tag: "Geography", takeaway: "Evaporation → condensation → precipitation, endlessly." },
];

export default function EduClips() {
  return (
    <section className="lp-section" style={{ background: "var(--bg)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 100, background: "rgb(var(--success-rgb) / 0.1)", border: "1px solid rgb(var(--success-rgb) / 0.25)", fontSize: 12, fontWeight: 700, color: "var(--success)", marginBottom: 14 }}>
            <BookOpen size={13} /> 20-SECOND LESSONS
          </div>
          <h2 className="lp-h2">Learn Something in <span className="lp-gradient-text">Seconds</span></h2>
          <p className="lp-sub">Quick animated clips that make hard concepts click — perfect for a study break.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
          {CLIPS.map((c) => (
            <div key={c.id} className="lp-glass" style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
              <c.clip />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <div className="font-black text-text text-sm">{c.title}</div>
                <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 6, background: "rgb(var(--success-rgb) / 0.12)", color: "var(--success)" }}>{c.tag}</span>
              </div>
              <div className="text-xs text-text-muted mt-1" style={{ lineHeight: 1.5 }}>{c.takeaway}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
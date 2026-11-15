// Hero carousel — vivid animated educational background scenes with
// glassmorphic content cards. Auto-advances with fade; transparent, vivid.
// Backgrounds: code-drawn animated SVG scenes (crisp, zero-load) — admin can
// override slide 1 with an uploaded hero image (siteContent/landing hero).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import DeviceShowcase from "./DeviceShowcase";
import { loadHomepageContent, DEFAULT_HOMEPAGE } from "../../lib/homepageContent";

// ── Animated SVG background scenes (each fills the slide) ──
function SceneStudy() {
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="sc1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0F2027" /><stop offset="50%" stopColor="#203A43" /><stop offset="100%" stopColor="#2C5364" />
        </linearGradient>
        <radialGradient id="sc1Glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" /><stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc1)" />
      <rect width="800" height="500" fill="url(#sc1Glow)" className="sc-pulse" />
      {/* desk */}
      <rect x="100" y="360" width="600" height="18" rx="6" fill="#3E2723" />
      <rect x="140" y="378" width="14" height="90" fill="#4E342E" />
      <rect x="646" y="378" width="14" height="90" fill="#4E342E" />
      {/* books */}
      <g className="sc-books">
        <rect x="180" y="300" width="120" height="18" rx="4" fill="var(--primary)" opacity="0.85" />
        <rect x="190" y="282" width="100" height="18" rx="4" fill="var(--accent)" opacity="0.8" />
        <rect x="200" y="264" width="80" height="18" rx="4" fill="var(--success)" opacity="0.8" />
      </g>
      {/* lamp */}
      <g className="sc-lamp">
        <rect x="560" y="270" width="8" height="90" fill="#90A4AE" />
        <path d="M540 270 Q564 240 588 270 Z" fill="#FFB300" opacity="0.9" />
        <circle cx="564" cy="272" r="26" fill="#FFD54F" opacity="0.18" className="sc-lampglow" />
      </g>
      {/* floating formulas */}
      <text x="620" y="150" fontSize="20" fill="var(--primary)" opacity="0.5" className="sc-float1" fontFamily="monospace">E = mc²</text>
      <text x="120" y="180" fontSize="18" fill="var(--accent)" opacity="0.4" className="sc-float2" fontFamily="monospace">a² + b² = c²</text>
      <text x="380" y="120" fontSize="16" fill="var(--success)" opacity="0.35" className="sc-float1" fontFamily="monospace">H₂O</text>
      <style>{`
        .sc-pulse { animation: scPulse 6s ease-in-out infinite; }
        @keyframes scPulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
        .sc-books { animation: scBooks 5s ease-in-out infinite; transform-origin: 240px 300px; }
        @keyframes scBooks { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .sc-lampglow { animation: scGlow 3s ease-in-out infinite; }
        @keyframes scGlow { 0%,100% { opacity: 0.15; } 50% { opacity: 0.3; } }
        .sc-float1 { animation: scFloat 7s ease-in-out infinite; }
        .sc-float2 { animation: scFloat 9s ease-in-out infinite reverse; }
        @keyframes scFloat { 0%,100% { transform: translateY(0); opacity: 0.35; } 50% { transform: translateY(-14px); opacity: 0.6; } }
      `}</style>
    </svg>
  );
}

function SceneGraduation() {
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="sc2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A0A2E" /><stop offset="50%" stopColor="#2D1B4E" /><stop offset="100%" stopColor="#4A2C6D" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc2)" />
      {/* confetti */}
      {Array.from({ length: 24 }).map((_, i) => (
        <rect key={i} x={(i * 137) % 780} y={(i * 89) % 480} width="6" height="10" rx="2"
          fill={["#FFD700", "#FF6B6B", "#4ECDC4", "#95E1D3", "#F38181"][i % 5]}
          className="sc-confetti" style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
      {/* graduation cap */}
      <g transform="translate(400, 250)" className="sc-cap">
        <polygon points="0,-30 80,0 0,30 -80,0" fill="#1A1A2E" stroke="var(--primary)" strokeWidth="2" />
        <rect x="-20" y="0" width="40" height="26" fill="#16213E" />
        <line x1="80" y1="0" x2="80" y2="40" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="80" cy="44" r="6" fill="var(--accent)" />
      </g>
      <text x="400" y="360" textAnchor="middle" fontSize="26" fontWeight="900" fill="var(--primary)" opacity="0.85">Class of 2026</text>
      <style>{`
        .sc-confetti { animation: scFall 4s linear infinite; }
        @keyframes scFall { 0% { transform: translateY(-20px); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(520px); opacity: 0; } }
        .sc-cap { animation: scCap 4s ease-in-out infinite; transform-origin: 400px 250px; }
        @keyframes scCap { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(2deg); } }
      `}</style>
    </svg>
  );
}

function SceneCommunity() {
  return (
    <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden="true">
      <defs>
        <linearGradient id="sc3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D1B2A" /><stop offset="50%" stopColor="#1B263B" /><stop offset="100%" stopColor="#274060" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill="url(#sc3)" />
      {/* chat bubbles */}
      <g className="sc-bubble1">
        <rect x="120" y="120" width="220" height="64" rx="16" fill="var(--bg-2)" stroke="var(--border)" opacity="0.9" />
        <circle cx="150" cy="146" r="12" fill="var(--primary)" opacity="0.8" />
        <rect x="172" y="138" width="120" height="8" rx="4" fill="var(--text-muted)" opacity="0.5" />
        <rect x="172" y="154" width="90" height="8" rx="4" fill="var(--text-muted)" opacity="0.3" />
      </g>
      <g className="sc-bubble2">
        <rect x="460" y="200" width="220" height="64" rx="16" fill="var(--primary)" opacity="0.85" />
        <rect x="480" y="218" width="130" height="8" rx="4" fill="rgba(0,0,0,0.4)" />
        <rect x="480" y="234" width="100" height="8" rx="4" fill="rgba(0,0,0,0.25)" />
      </g>
      <g className="sc-bubble3">
        <rect x="200" y="300" width="260" height="72" rx="16" fill="rgb(var(--accent-rgb) / 0.18)" stroke="var(--accent)" strokeOpacity="0.5" />
        <text x="220" y="330" fontSize="12" fontWeight="800" fill="var(--accent)">AI Study Assistant</text>
        <rect x="220" y="342" width="180" height="8" rx="4" fill="var(--text-muted)" opacity="0.4" />
        <rect x="220" y="356" width="140" height="8" rx="4" fill="var(--text-muted)" opacity="0.25" />
      </g>
      {/* avatar dots */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={600 + i * 40} cy={420} r="16" fill="var(--primary)" opacity={0.3 + i * 0.15} className="sc-avatar" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
      <style>{`
        .sc-bubble1 { animation: scDrift1 6s ease-in-out infinite; }
        .sc-bubble2 { animation: scDrift2 7s ease-in-out infinite; }
        .sc-bubble3 { animation: scDrift1 8s ease-in-out infinite reverse; }
        @keyframes scDrift1 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes scDrift2 { 0%,100% { transform: translateY(0); } 50% { transform: translateY(12px); } }
        .sc-avatar { animation: scBlink 2.5s ease-in-out infinite; }
        @keyframes scBlink { 0%,100% { opacity: 0.3; } 50% { opacity: 0.8; } }
      `}</style>
    </svg>
  );
}

// Scene registry — admin picks a scene id per slide.
const SCENES = {
  study: SceneStudy,
  graduation: SceneGraduation,
  community: SceneCommunity,
};

export default function HeroCarousel({ user }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slides, setSlides] = useState(DEFAULT_HOMEPAGE.slides);

  // Load admin-customized content (falls back to defaults)
  useEffect(() => {
    let live = true;
    loadHomepageContent().then((c) => { if (live) setSlides(c.slides); }).catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  useEffect(() => {
    if (idx >= slides.length) setIdx(0);
  }, [slides.length, idx]);

  const slide = slides[idx] || slides[0];
  const Scene = SCENES[slide?.scene] || SceneStudy;

  return (
    <section
      style={{ position: "relative", minHeight: "88vh", display: "flex", alignItems: "center", overflow: "hidden" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Background scenes (crossfade) */}
      {slides.map((s, i) => {
        const S = SCENES[s.scene] || SceneStudy;
        return (
          <div key={`${s.id || "s"}-${i}`} style={{
            position: "absolute", inset: 0,
            opacity: i === idx ? 1 : 0,
            transition: "opacity 1s ease",
            pointerEvents: "none",
          }}>
            <S />
          </div>
        );
      })}
      {/* Dark overlay for text clarity */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.25) 60%, transparent 100%)", pointerEvents: "none" }} />

      {/* Content */}
      <div className="lp-container" style={{ position: "relative", zIndex: 2, width: "100%", paddingTop: 100, paddingBottom: 60 }}>
        <div className="hero-split" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 40, alignItems: "center" }}>
          <div key={slide.id} style={{ maxWidth: 560, animation: "heroSlideIn 0.6s ease" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 100, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", marginBottom: 20, fontSize: 12, fontWeight: 700, color: "#fff" }}>
              <Sparkles size={13} /> {slide.eyebrow}
            </div>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 900, lineHeight: 1.1, margin: "0 0 18px", letterSpacing: "-0.03em", color: "#fff", textShadow: "0 2px 20px rgba(0,0,0,0.4)" }}>
              {slide.title}
            </h1>
            <p style={{ fontSize: 17, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", margin: "0 0 26px", textShadow: "0 1px 10px rgba(0,0,0,0.3)" }}>
              {slide.body}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to={user ? "/dashboard" : (slide.ctaTo || "/auth")} className="lp-btn-primary" style={{ background: "var(--primary)", color: "#04120D" }}>
                {user ? "Go to Dashboard" : (slide.ctaLabel || "Start Free")} <ArrowRight size={18} />
              </Link>
              {slide.secondaryLabel && (
                <Link to={slide.secondaryTo || "/demo"} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "14px 24px", borderRadius: 12, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "#fff", fontWeight: 700, fontSize: 15, textDecoration: "none", backdropFilter: "blur(10px)" }}>
                  {slide.secondaryLabel}
                </Link>
              )}
            </div>
          </div>

          {/* Live phone simulation — auto-solves demo questions */}
          <div className="hero-phone">
            <DeviceShowcase />
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 3 }}>
        {slides.map((s, i) => (
          <button key={`${s.id || "d"}-${i}`} onClick={() => setIdx(i)} aria-label={`Go to slide ${i + 1}`} style={{
            width: i === idx ? 28 : 10, height: 10, borderRadius: 6, border: "none", cursor: "pointer",
            background: i === idx ? "var(--primary)" : "rgba(255,255,255,0.4)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      <style>{`
        @keyframes heroSlideIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .hero-split { grid-template-columns: 1fr !important; gap: 28px !important; }
          .hero-phone { order: 2; max-width: 340px; margin: 0 auto; }
          section { min-height: auto !important; }
        }
        @media (max-width: 480px) {
          .hero-phone { transform: scale(0.92); }
        }
      `}</style>
    </section>
  );
}
// Stats bar (animated CountUp) + 6-card bento grid.
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen, Brain, GraduationCap, TrendingUp, Trophy, Target, ArrowRight,
} from "lucide-react";
import { STATS as STATS_CONFIG } from "../../lib/stats";

function CountUp({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        const target = parseInt(String(end).replace(/[^0-9]/g, ""), 10) || 0;
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          setCount(Math.floor(progress * target));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{Number(count).toLocaleString("en-NG")}{suffix}</span>;
}

const STATS = [
  { value: String(STATS_CONFIG.practiceQuestions), suffix: "+", label: "Practice Questions" },
  { value: String(STATS_CONFIG.subjects), suffix: "", label: "Subjects Covered" },
  { value: String(STATS_CONFIG.highYieldTopics), suffix: "+", label: "High-Yield Topics" },
  { value: String(STATS_CONFIG.examBodies), suffix: "", label: "Exam Bodies" },
];

function AnimatedStat({ value, suffix, decimals }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        const target = parseFloat(value);
        const start = performance.now();
        const step = (now) => {
          const progress = Math.min((now - start) / 2000, 1);
          const v = progress * target;
          setCount(decimals ? Math.round(v * 10) / 10 : Math.floor(v));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, decimals]);

  return <span ref={ref}>{Number(count).toLocaleString("en-NG")}{suffix}</span>;
}

const FEATURES = [
  { icon: BookOpen, title: "Real Past Questions", description: "JAMB, WAEC & NABTEB questions from 2017–2026 with detailed AI explanations." },
  { icon: Brain, title: "AI Tutor", description: "Get instant step-by-step explanations. Ask anything, anytime." },
  { icon: GraduationCap, title: "Exam Mode", description: "Real exam environment with timed sessions and instant scoring." },
  { icon: TrendingUp, title: "Smart Analytics", description: "Track your strengths, weaknesses, and improvement over time." },
  { icon: Trophy, title: "Gamified Learning", description: "Earn XP, badges, and compete on leaderboards. Stay motivated." },
  { icon: Target, title: "Study Plans", description: "Personalized study schedules tailored to your exam date." },
];

export function LandingStats() {
  return (
    <section style={{ padding: "40px 0", background: "var(--bg-2)", borderBottom: "1px solid var(--border)" }}>
      <div className="lp-container">
        <div className="lp-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }}>
          {STATS.map((stat, i) => (
            <div key={stat.label} className={`lp-animate-in lp-delay-${i + 1}`}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--primary)", marginBottom: 4 }}>
                <AnimatedStat value={stat.value} suffix={stat.suffix} decimals={stat.decimals} />
              </div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function LandingBento() {
  return (
    <section id="features" className="lp-section" style={{ background: "var(--bg)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="lp-h2">Everything You Need to <span className="lp-gradient-text">Excel</span></h2>
          <p className="lp-sub">From past questions to AI tutoring — the complete exam prep toolkit.</p>
        </div>
        <div className="lp-bento-grid">
          {FEATURES.slice(0, 2).map((f, i) => (
            <div key={f.title} className={`lp-bento-card lp-animate-in lp-delay-${i + 1}`}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgb(var(--primary-rgb) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={26} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
            </div>
          ))}
          <div className="lp-bento-wide lp-animate-in lp-delay-3" style={{
            background: "var(--landing-gradient)", borderRadius: 20,
            padding: 32, color: "#fff", position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "relative", zIndex: 1 }}>
              <h3 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>AI-Powered Learning at Your Fingertips</h3>
              <p style={{ fontSize: 14, opacity: 0.85, maxWidth: 500, margin: "0 0 20px", lineHeight: 1.6 }}>
                Our AI understands the West African curriculum. Ask questions, get explanations,
                and receive personalized study recommendations.
              </p>
              <Link to="/auth" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", borderRadius: 10, background: "rgba(255,255,255,0.2)",
                color: "#fff", fontWeight: 600, fontSize: 13, textDecoration: "none",
                backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)",
              }}>
                Try AI Tutor <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ position: "absolute", right: -20, top: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          </div>
          {FEATURES.slice(2).map((f, i) => (
            <div key={f.title} className={`lp-bento-card lp-animate-in lp-delay-${(i % 5) + 1}`}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgb(var(--primary-rgb) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <f.icon size={26} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Keep the old CountUp export (unused elsewhere, harmless) — replaced by AnimatedStat above.
export { CountUp };

// Landing hero — headline, CTAs, trust chips, live stats, phone mockup.
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, WifiOff, Gift, TrendingUp, Users, BookOpen, Globe } from "lucide-react";
import LandingMedia from "./LandingMedia";
import DeviceShowcase from "./DeviceShowcase";
import { getDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useEffect, useState } from "react";
import { TRUST_BADGES, STATS_DISPLAY } from "../../lib/stats";

const CHIPS = TRUST_BADGES;

export default function LandingHero({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      try {
        const s = await getDoc(doc(db, "stats", "global"));
        if (s.exists()) setStats(s.data());
      } catch { /* stats optional */ }
    }
    loadStats();
  }, []);

  return (
    <section style={{
      padding: "120px 0 80px",
      background: "linear-gradient(180deg, rgb(var(--primary-rgb) / 0.08) 0%, var(--bg) 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -100, right: -100, width: 400, height: 400,
        borderRadius: "50%", background: "radial-gradient(circle, rgb(var(--primary-rgb) / 0.14) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: -60, left: -60, width: 300, height: 300,
        borderRadius: "50%", background: "radial-gradient(circle, rgb(var(--accent-rgb) / 0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div className="lp-container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "center" }} className="lp-hero-grid">
          <div style={{ textAlign: "left" }}>
            <div className="lp-animate-in" style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 16px 6px 6px", borderRadius: 100,
              background: "rgb(var(--primary-rgb) / 0.1)", border: "1px solid rgb(var(--primary-rgb) / 0.25)",
              marginBottom: 24, fontSize: 13, fontWeight: 600, color: "var(--primary)",
            }}>
              <span style={{ background: "var(--landing-gradient)", color: "#fff", padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>NEW</span>
              AI-Powered Exam Prep for West African Students
            </div>
            <h1 className="lp-animate-in lp-delay-1" style={{ fontSize: "clamp(2rem, 6vw, 3.25rem)", fontWeight: 900, lineHeight: 1.08, margin: "0 0 20px", letterSpacing: "-0.03em" }}>
              Ace Your Exams with <span className="lp-gradient-text">AI-Powered</span> Precision
            </h1>
            <p className="lp-animate-in lp-delay-2" style={{ fontSize: 18, lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 520, margin: "0 0 20px" }}>
              10 years of JAMB, WAEC, NECO, NABTEB & IELTS questions — strategically analyzed for
              the most repeated topics, objectives and essays. Practice with AI explanations,
              take timed exams, and track your progress — all in one platform.
            </p>
            <div style={{ margin: "0 0 20px" }}>
              <Link to="/ielts" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                ✈️ Going abroad? See the IELTS pathway →
              </Link>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", margin: "0 0 24px" }}>
              🌱 In SS1–SS3? Starting early is how geniuses are bred — <Link to="/auth" style={{ fontWeight: 700, color: "var(--primary)" }}>begin now, free</Link>.
            </div>
            <div className="lp-animate-in lp-delay-3" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <Link to={user ? "/dashboard" : "/auth"} className="lp-btn-primary">
                {user ? "Go to Dashboard" : "Start Free"} <ArrowRight size={18} />
              </Link>
              <a href="#features" className="lp-btn-ghost">Learn More</a>
            </div>
            <div className="lp-animate-in lp-delay-4" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {CHIPS.map((c) => (
                <span key={c.label} className="lp-glass" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 14px", borderRadius: 100, fontSize: 13, fontWeight: 600,
                  color: "var(--text)",
                }}>
                  <c.icon size={15} color="var(--primary)" /> {c.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <LandingMedia slot="hero" alt="ExamPadi practice screen" mockup={<DeviceShowcase />} />
          </div>
        </div>
        {stats && (
          <div style={{ display: "flex", gap: 24, marginTop: 48, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { icon: Users, label: "Active Students", value: stats.totalUsers || "500+" },
              { icon: BookOpen, label: "Questions Answered", value: stats.totalQuestions?.toLocaleString() || "50,000+" },
              { icon: TrendingUp, label: "Success Rate", value: "87%" },
            ].map((s) => (
              <div key={s.label} className="lp-glass" style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 20px", borderRadius: 12, textAlign: "center",
              }}>
                <s.icon size={20} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .lp-hero-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

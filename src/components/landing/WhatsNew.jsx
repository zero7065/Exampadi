// What's New — showcases the latest features with animated clip previews.
import { Link } from "react-router-dom";
import { FEATURE_CLIPS } from "./FeatureClips";
import { Sparkles, ArrowRight, Users, Swords, Crown, Gamepad2, LineChart, ShieldCheck } from "lucide-react";

const NEW_FEATURES = [
  { icon: Users, title: "School Communities", desc: "Auto-join your school's private group after payment or admin approval. Chat with classmates and teachers, with AI assist for instant help.", to: "/community", tag: "Social" },
  { icon: Gamepad2, title: "Chess & Brain Games", desc: "Play chess against AI across 10 difficulty levels (beginner → grandmaster). Trivia, riddles and pattern puzzles too.", to: "/games", tag: "Games" },
  { icon: Swords, title: "Challenge Friends", desc: "Send game challenges to study partners, accept invites, and like each other's wins. Compete with respect.", to: "/games", tag: "Compete" },
  { icon: Crown, title: "Legend Mode", desc: "Learn any topic through riddles, metaphors, poems, stories or edu-hacks — with adjustable strictness from gentle to legend.", to: "/legend", tag: "Learn" },
  { icon: LineChart, title: "Learning Patterns", desc: "As you practice, we track your best study hours, weakest subjects and pace — and turn them into smart recommendations.", to: "/stats", tag: "Insights" },
  { icon: ShieldCheck, title: "School Management", desc: "Schools get management logins, performance tracking, 72h smart sync, and admin messaging — all private per school.", to: "/schools", tag: "Schools" },
];

export default function WhatsNew() {
  return (
    <section className="lp-section" style={{ background: "linear-gradient(180deg, var(--bg), rgb(var(--primary-rgb) / 0.05), var(--bg))" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 100, background: "rgb(var(--primary-rgb) / 0.1)", border: "1px solid rgb(var(--primary-rgb) / 0.25)", fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 14 }}>
            <Sparkles size={13} /> JUST SHIPPED
          </div>
          <h2 className="lp-h2">New on <span className="lp-gradient-text">ExamPadi</span></h2>
          <p className="lp-sub">Fresh features to keep you learning, competing and connected — live in the app now.</p>
        </div>

        {/* Animated clips */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 16, marginBottom: 40 }}>
          {FEATURE_CLIPS.map((f) => (
            <div key={f.id} className="lp-glass" style={{ padding: 14, borderRadius: 16, border: "1px solid var(--border)", background: "var(--bg-2)" }}>
              <f.clip />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
                <div className="font-black text-text text-sm">{f.label}</div>
              </div>
              <div className="text-xs text-text-muted mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 14 }}>
          {NEW_FEATURES.map((f) => (
            <Link key={f.title} to={f.to} className="lp-glass" style={{
              display: "flex", gap: 12, padding: 18, borderRadius: 14, textDecoration: "none",
              border: "1px solid var(--border)", transition: "border-color 0.2s, transform 0.2s",
            }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <f.icon size={19} style={{ color: "var(--primary)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span className="font-black text-text text-sm">{f.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: "rgb(var(--primary-rgb) / 0.12)", color: "var(--primary)" }}>{f.tag}</span>
                </div>
                <p className="text-xs text-text-muted" style={{ margin: 0, lineHeight: 1.55 }}>{f.desc}</p>
              </div>
              <ArrowRight size={15} style={{ color: "var(--text-muted)", alignSelf: "center", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
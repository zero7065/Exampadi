// Games showcase — animated cards for chess, brain teasers, community.
import { Link } from "react-router-dom";
import { Crown, Brain, Swords, Users, Trophy, ChevronRight } from "lucide-react";

const SHOWCASE = [
  { icon: Crown, title: "Chess vs AI", desc: "10 levels from beginner to grandmaster. Real rules, streaks and achievements.", color: "var(--primary)", bg: "linear-gradient(135deg, rgb(var(--primary-rgb) / 0.14), rgb(var(--primary-rgb) / 0.03))", to: "/auth" },
  { icon: Brain, title: "Brain Training", desc: "Trivia, riddles and pattern puzzles that sharpen your mind between study sessions.", color: "var(--accent)", bg: "linear-gradient(135deg, rgb(var(--accent-rgb) / 0.14), rgb(var(--accent-rgb) / 0.03))", to: "/auth" },
  { icon: Swords, title: "Challenge Friends", desc: "Send game challenges to study partners, compare scores and like each other's wins.", color: "var(--success)", bg: "linear-gradient(135deg, rgb(var(--success-rgb) / 0.14), rgb(var(--success-rgb) / 0.03))", to: "/auth" },
  { icon: Users, title: "School Community", desc: "Private school group chats with AI assist — gist, learn and help each other.", color: "var(--danger)", bg: "linear-gradient(135deg, rgb(var(--danger-rgb) / 0.10), rgb(var(--danger-rgb) / 0.03))", to: "/auth" },
];

export default function LandingGames() {
  return (
    <section className="lp-section" style={{ background: "linear-gradient(180deg, var(--bg), rgb(var(--accent-rgb) / 0.04), var(--bg))" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px", borderRadius: 100, background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.25)", fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 14 }}>
            <Trophy size={13} /> MORE THAN STUDYING
          </div>
          <h2 className="lp-h2">Play. <span className="lp-gradient-text">Compete. Belong.</span></h2>
          <p className="lp-sub">Study smarter with games, challenges and a school community that keeps you motivated.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
          {SHOWCASE.map((g) => (
            <Link key={g.title} to={g.to} className="lp-glass" style={{
              padding: 22, borderRadius: 18, display: "block", textDecoration: "none",
              background: g.bg, border: "1px solid var(--border)",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.25)"; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-3)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <g.icon size={22} style={{ color: g.color }} />
              </div>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6 }}>{g.desc}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, marginTop: 10, color: g.color }}>
                Try it <ChevronRight size={13} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
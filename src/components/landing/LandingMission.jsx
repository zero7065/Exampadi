// Mission: aim, objectives, and live coverage data.
import { Target, Eye, BarChart3, Wifi, Users, ShieldCheck, BookOpen, Calendar } from "lucide-react";
import { STATS_DISPLAY } from "../../lib/stats";

const OBJECTIVES = [
  { icon: Target, title: "Exam mastery, not cramming", body: "Every feature — practice, mocks, flashcards, plans — drives long-term retention measured by rising accuracy, not hours logged." },
  { icon: Eye, title: "Know exactly where you stand", body: "Mastery tracking, weak-topic detection and repetition intelligence show you what to study next, every single day." },
  { icon: Wifi, title: "Work on any network", body: "Offline-first design, tiny data footprint, and honest degraded-mode messaging for real Nigerian networks." },
  { icon: Users, title: "Lift entire classrooms", body: "Teacher dashboards, printable exams and parent reports bring the same intelligence to schools and tutorial centres." },
];

const COVERAGE = [
  { icon: BookOpen, value: STATS_DISPLAY.practiceQuestions, label: "Practice Questions" },
  { icon: Target, value: STATS_DISPLAY.subjects, label: "Subjects Covered" },
  { icon: ShieldCheck, value: STATS_DISPLAY.examBodies, label: "Exam Bodies" },
  { icon: Calendar, value: STATS_DISPLAY.yearsOfQuestions, label: "Years of Questions" },
];

export default function LandingMission() {
  return (
    <section id="mission" className="lp-section" style={{ background: "var(--bg-2)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 className="lp-h2">Our <span className="lp-gradient-text">mission</span></h2>
          <p className="lp-sub" style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", maxWidth: 640 }}>
            Make passing JAMB, WAEC, NECO and NABTEB a matter of method — not luck,
            background, or expensive lesson fees.
          </p>
        </div>

        <div className="lp-bento-grid" style={{ marginBottom: 40 }}>
          {OBJECTIVES.map((o, i) => (
            <div key={o.title} className={`lp-bento-card lp-delay-${(i % 5) + 1}`}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgb(var(--primary-rgb) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <o.icon size={24} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{o.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>{o.body}</p>
            </div>
          ))}
        </div>

        <div className="lp-glass" style={{ borderRadius: 20, padding: "28px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, textAlign: "center" }}>
          {COVERAGE.map((c) => (
            <div key={c.label}>
              <c.icon size={20} color="var(--primary)" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900 }}>{c.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{c.label}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 640px) { #mission .lp-glass { grid-template-columns: 1fr 1fr !important; } }`}</style>
    </section>
  );
}

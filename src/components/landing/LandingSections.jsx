// Landing sections: Why Us, Strategic Analysis, IELTS, Why For You, How It Works, Testimonials.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Users, BookOpen, Zap, MessageSquare, Target, Award, Plane, GraduationCap, Globe } from "lucide-react";
import { listApprovedReviews } from "../../lib/community";
import { EXAM_QUESTION_COUNTS } from "../../lib/stats";

const WHY_US = [
  { emoji: "🎯", title: "Built for Nigerian Exams", body: "Not generic edtech. Every question, explanation and plan targets JAMB, WAEC, NECO, NABTEB & IELTS syllabi." },
  { emoji: "🤖", title: "AI That Explains, Not Just Answers", body: "Every answer comes with step-by-step reasoning, so you learn the method — not just the option." },
  { emoji: "📴", title: "Works Offline", body: "Questions, progress and the app shell keep working with poor or no network. Your data syncs when you're back." },
  { emoji: "🆓", title: "Free to Start, Fair to Upgrade", body: "15 questions + 3 AI messages daily, free forever. Pro is priced for Nigerian students and schools." },
  { emoji: "📊", title: "Knows Your Weak Spots", body: "Mastery tracking, weak-topic detection and adaptive assignments focus you where marks are lost." },
  { emoji: "👥", title: "Learn Together", body: "Study partners, shared tests and leaderboards keep you accountable and motivated daily." },
];

const STRATEGIC_DATA = [
  { exam: "JAMB", years: "2015-2025", topTopic: "Use of English — Comprehension & Lexis", insight: "60% of questions repeat concepts from previous 5 years" },
  { exam: "WAEC", years: "2015-2025", topTopic: "Mathematics — Algebra & Geometry", insight: "Essay questions follow predictable patterns by subject" },
  { exam: "NECO", years: "2015-2025", topTopic: "Biology — Cell Biology & Genetics", insight: "Practical questions rotate on a 3-year cycle" },
  { exam: "NABTEB", years: "2015-2025", topTopic: "Technical — Trade Theory", insight: "Trade theory questions are 70% repeated from past papers" },
  { exam: "IELTS", years: "2023-2025", topTopic: "Academic Reading & Writing Task 2", insight: "Writing Task 2 topics cluster around 10 themes" },
];

const WHY_FOR_YOU = [
  { icon: GraduationCap, title: "SS1 Students", body: "Start building foundations early. Master topics before they become exam pressure. By SS3, you're ahead of 90% of candidates." },
  { icon: Target, title: "SS2 Students", body: "Identify weak topics now. Fill gaps before they compound. Practice with real past questions from your target exam." },
  { icon: Award, title: "SS3 / Final Year", body: "Peak preparation mode. Timed exams, AI coaching, and strategic revision of the most repeated topics." },
  { icon: Users, title: "School Groups", body: "Classroom plans from ₦2,800/student/month. Teacher dashboard, assignments, and AI-compiled performance reports." },
  { icon: Plane, title: "Study Abroad", body: "IELTS preparation with band score calculator, writing feedback, and visa requirement guide. ₦80,000/year." },
  { icon: Globe, title: "International Students", body: "Pay in NGN, USD, GHS, KES, or ZAR. Same great experience, any currency." },
];

export function LandingWhyUs() {
  return (
    <section id="why-us" className="lp-section" style={{ background: "var(--bg-2)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="lp-h2">Why <span className="lp-gradient-text">ExamPadi</span>?</h2>
          <p className="lp-sub">Six reasons students and schools choose us over generic study apps.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-why-grid">
          {WHY_US.map((w, i) => (
            <div key={w.title} className={`lp-bento-card lp-animate-in lp-delay-${(i % 5) + 1}`}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{w.emoji}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{w.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, margin: 0 }}>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-why-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

export function LandingStrategic() {
  return (
    <section className="lp-section" style={{ background: "var(--bg)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="lp-h2">10 Years of <span className="lp-gradient-text">Strategic Analysis</span></h2>
          <p className="lp-sub">Not just questions — deep research into what examiners actually test, year after year.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {STRATEGIC_DATA.map((d) => (
            <div key={d.exam} className="lp-bento-card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: "var(--primary)" }}>{d.exam}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.years}</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                {(EXAM_QUESTION_COUNTS[d.exam] || 0).toLocaleString("en-NG")}+
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>questions analyzed</div>
              <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgb(var(--primary-rgb) / 0.08)", marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginBottom: 2 }}>TOP TOPIC</div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>{d.topTopic}</div>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 }}>{d.insight}</div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-why-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

export function LandingIELTS() {
  return (
    <section className="lp-section" style={{ background: "var(--bg-2)" }}>
      <div className="lp-container" style={{ maxWidth: 960 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="lp-about-grid">
          <div>
            <h2 className="lp-h2">✈️ IELTS — <span className="lp-gradient-text">Study Abroad Ready</span></h2>
            <p className="lp-sub" style={{ marginBottom: 20 }}>
              Planning to study, work, or migrate abroad? IELTS is your gateway. ExamPadi gives you
              the full preparation: real past questions, writing feedback, speaking practice, and
              visa-specific band requirements.
            </p>
            <ul style={{ margin: "0 0 24px", paddingLeft: 20, fontSize: 14, lineHeight: 2, color: "var(--text-muted)" }}>
              <li><strong className="text-text">100 real IELTS questions</strong> — Academic & General</li>
              <li><strong className="text-text">Band score calculator</strong> — know your target</li>
              <li><strong className="text-text">Writing task feedback</strong> — AI reviews your essays</li>
              <li><strong className="text-text">Visa requirement guide</strong> — study, work, migration</li>
              <li><strong className="text-text">Speaking practice prompts</strong> — all 3 parts covered</li>
            </ul>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/ielts" className="lp-btn-primary" style={{ padding: "12px 28px", fontSize: 15 }}>
                <Plane size={17} /> Explore IELTS Prep
              </Link>
              <div style={{ padding: "12px 20px", borderRadius: 12, background: "rgb(var(--accent-rgb) / 0.1)", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
                ₦80,000/year
              </div>
            </div>
          </div>
          <div className="lp-animate-in">
            <div className="lp-bento-card" style={{ padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>Band 6.0 – 8.0+</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>Target scores for top universities worldwide</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                {[
                  ["UK Universities", "6.0–6.5"],
                  ["Canada", "6.5"],
                  ["Australia", "6.0–6.5"],
                  ["USA", "6.5–8.0"],
                ].map(([k, v]) => (
                  <div key={k} style={{ padding: "8px", borderRadius: 8, background: "var(--bg-3)" }}>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>{k}</div>
                    <div style={{ color: "var(--text-muted)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-about-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

export function LandingWhyForYou() {
  return (
    <section className="lp-section" style={{ background: "var(--bg)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="lp-h2">Why <span className="lp-gradient-text">It's For You</span></h2>
          <p className="lp-sub">Whether you're in SS1 or final year, planning local or international — ExamPadi meets you where you are.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {WHY_FOR_YOU.map((w, i) => (
            <div key={w.title} className={`lp-bento-card lp-animate-in lp-delay-${(i % 5) + 1}`}>
              <w.icon size={28} color="var(--primary)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{w.title}</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-why-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

import StudentsIllustration from "./StudentsIllustration";

export function LandingAbout() {
  return (
    <section id="about" className="lp-section" style={{ background: "var(--bg-2)" }}>
      <div className="lp-container" style={{ maxWidth: 960 }}>
        <div className="lp-about-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }}>
          <div style={{ textAlign: "left" }}>
            <h2 className="lp-h2">Built by Students of the <span className="lp-gradient-text">System</span></h2>
            <p className="lp-sub" style={{ marginBottom: 20 }}>
              ExamPadi was built by Jadai Studios to solve a simple problem: brilliant Nigerian students
              fail exams they could pass — not for lack of effort, but for lack of the right practice tools.
            </p>
            <p className="lp-sub" style={{ marginBottom: 32 }}>
              So we combined real past questions, an AI tutor that explains like a patient teacher,
              and timed exam practice — and made it work on the cheapest phones and the weakest networks.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a
                href="https://wa.me/2348127636057"
                target="_blank"
                rel="noopener noreferrer"
                className="lp-btn-primary"
                style={{ padding: "12px 28px", fontSize: 15 }}
              >
                <MessageSquare size={17} /> Chat on WhatsApp
              </a>
              <a href="mailto:jadai7065@gmail.com" className="lp-btn-ghost" style={{ padding: "12px 28px", fontSize: 15 }}>
                jadai7065@gmail.com
              </a>
            </div>
          </div>
          <div className="lp-animate-in">
            <StudentsIllustration />
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .lp-about-grid { grid-template-columns: 1fr !important; }
          .lp-about-grid > div:first-child { text-align: center; }
          .lp-about-grid > div:first-child div:last-child { justify-content: center; }
        }
      `}</style>
    </section>
  );
}

const STEPS = [
  { step: "01", title: "Create Account", desc: "Sign up free in 30 seconds. No credit card needed.", icon: Users },
  { step: "02", title: "Choose Your Exam", desc: "Select JAMB, WAEC, NECO, NABTEB or IELTS and pick your subjects.", icon: BookOpen },
  { step: "03", title: "Start Practicing", desc: "Answer questions, review AI explanations, and track your progress.", icon: Zap },
];

export function LandingHow() {
  return (
    <section className="lp-section" style={{ background: "var(--bg)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 className="lp-h2">How It <span className="lp-gradient-text">Works</span></h2>
          <p className="lp-sub">Start improving your grades in three simple steps.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="lp-how-grid">
          {STEPS.map((item, i) => (
            <div key={item.step} className={`lp-bento-card lp-animate-in lp-delay-${i + 1}`} style={{ textAlign: "center" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "var(--landing-gradient)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, fontWeight: 900, margin: "0 auto 20px",
                boxShadow: "0 8px 24px rgb(var(--primary-rgb) / 0.3)",
              }}>{item.step}</div>
              <item.icon size={28} color="var(--primary)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-how-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

const TESTIMONIALS = [
  { name: "Chidera O.", text: "ExamPadi helped me score 320 in JAMB! The AI Tutor is a game-changer.", exam: "JAMB 2025", rating: 5 },
  { name: "Aisha B.", text: "I passed WAEC with 8 A's thanks to the timed exam practice. Felt like the real exam!", exam: "WAEC 2025", rating: 5 },
  { name: "Emeka N.", text: "The gamification keeps me studying daily. 150-day streak and counting!", exam: "NABTEB 2025", rating: 5 },
];

function initials(name) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export function LandingTestimonials() {
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    listApprovedReviews(6).then(setReviews).catch(() => {});
  }, []);

  const display = reviews.length > 0 ? reviews : TESTIMONIALS;

  return (
    <section className="lp-section" style={{ background: "var(--bg-2)" }}>
      <div className="lp-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 className="lp-h2">Students <span className="lp-gradient-text">Love</span> ExamPadi</h2>
          <p className="lp-sub">Real reviews from real students across Nigeria.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {display.map((r, i) => (
            <div key={i} className={`lp-bento-card lp-animate-in lp-delay-${(i % 5) + 1}`}>
              <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} size={16} color={j < (r.rating || 5) ? "var(--accent)" : "var(--border)"} fill={j < (r.rating || 5) ? "var(--accent)" : "none"} />
                ))}
              </div>
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7, margin: "0 0 16px" }}>"{r.text}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--landing-gradient)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800,
                }}>{initials(r.name || "Student")}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.exam || "ExamPadi User"}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .lp-why-grid { grid-template-columns: 1fr !important; } }`}</style>
    </section>
  );
}

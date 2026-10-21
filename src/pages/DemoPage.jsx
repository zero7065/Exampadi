import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, XCircle, Sparkles, Timer, BookOpen } from "lucide-react";
import Logo from "../components/Logo";
import LandingStyles from "../components/landing/LandingStyles";

const DEMO_QUESTIONS = [
  {
    exam: "JAMB",
    subject: "Physics",
    year: "2019",
    question: "A body moves with uniform acceleration. Which of the following quantities remains constant?",
    options: ["Velocity", "Acceleration", "Displacement", "Momentum"],
    answer: 1,
    explanation:
      "Uniform acceleration means the rate of change of velocity is constant. Velocity and displacement change with time, and momentum changes because velocity changes. Only acceleration stays constant.",
  },
  {
    exam: "WAEC",
    subject: "Chemistry",
    year: "2021",
    question: "Which gas turns lime water milky?",
    options: ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"],
    answer: 1,
    explanation:
      "Carbon dioxide reacts with calcium hydroxide (lime water) to form calcium carbonate, a white precipitate. That precipitate is what makes the solution look milky.",
  },
  {
    exam: "JAMB",
    subject: "English",
    year: "2022",
    question: "Choose the option nearest in meaning to the underlined word: The teacher's explanation was succinct.",
    options: ["Confusing", "Brief and clear", "Long-winded", "Incomplete"],
    answer: 1,
    explanation:
      "Succinct means expressed clearly and in very few words. 'Brief and clear' is the closest meaning.",
  },
];

export default function DemoPage() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.title = "Free Exam Demo — ExamPadi";
  }, []);

  const q = DEMO_QUESTIONS[index];

  function check() {
    if (selected == null) return;
    setChecked(true);
    if (selected === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (index === DEMO_QUESTIONS.length - 1) {
      setDone(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  }

  function restart() {
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setDone(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <LandingStyles />
      <header style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-2)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={34} />
            <span style={{ fontWeight: 900, fontSize: 17 }}>ExamPadi</span>
          </Link>
          <Link to="/auth" className="lp-btn-primary" style={{ padding: "9px 16px", fontSize: 13 }}>
            Start free <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "34px 18px 70px" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgb(var(--primary-rgb) / 0.10)", border: "1px solid rgb(var(--primary-rgb) / 0.25)", color: "var(--primary)", fontSize: 12, fontWeight: 800 }}>
            <Sparkles size={13} /> Free demo · no account needed
          </span>
          <h1 style={{ fontSize: "clamp(1.5rem, 5vw, 2.1rem)", fontWeight: 900, margin: "14px 0 8px", letterSpacing: "-0.02em" }}>
            Try real exam questions
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0, fontSize: 14 }}>
            Answer 3 questions and see how ExamPadi explains every answer.
          </p>
        </div>

        {done ? (
          <div className="glass-card" style={{ padding: 28, textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 900, color: "var(--primary)", lineHeight: 1 }}>{score}/3</div>
            <h2 style={{ margin: "10px 0 6px", fontSize: 22 }}>Demo complete</h2>
            <p style={{ color: "var(--text-muted)", margin: "0 auto 22px", maxWidth: 430, lineHeight: 1.6 }}>
              {score === 3
                ? "Excellent. You are ready for the real thing."
                : "Every mistake is a chance to learn. ExamPadi gives you an AI explanation for every question."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={restart} className="lp-btn-ghost">Try again</button>
              <Link to="/auth" className="lp-btn-primary">Create free account <ArrowRight size={16} /></Link>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><BookOpen size={14} /> {q.exam} {q.subject} · {q.year}</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Timer size={14} /> Question {index + 1} of {DEMO_QUESTIONS.length}</span>
            </div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--bg-elevated)", overflow: "hidden", marginBottom: 18 }}>
              <div style={{ height: "100%", width: `${((index + 1) / DEMO_QUESTIONS.length) * 100}%`, background: "var(--landing-gradient)", transition: "width .3s" }} />
            </div>

            <div className="glass-card" style={{ padding: "22px 20px" }}>
              <p style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.55, margin: "0 0 16px" }}>{q.question}</p>
              <div style={{ display: "grid", gap: 9 }}>
                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = checked && i === q.answer;
                  const isWrong = checked && isSelected && i !== q.answer;
                  return (
                    <button
                      key={opt}
                      disabled={checked}
                      onClick={() => setSelected(i)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        padding: "11px 13px", borderRadius: 10, fontFamily: "inherit", fontSize: 14,
                        cursor: checked ? "default" : "pointer",
                        background: isCorrect ? "rgb(var(--success-rgb) / 0.14)" : isWrong ? "rgb(var(--danger-rgb) / 0.12)" : isSelected ? "rgb(var(--primary-rgb) / 0.12)" : "var(--bg-2)",
                        border: `1px solid ${isCorrect ? "var(--success)" : isWrong ? "var(--danger)" : isSelected ? "var(--primary)" : "var(--border)"}`,
                        color: "var(--text)",
                      }}
                    >
                      <span style={{ width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", background: "var(--bg-elevated)", fontWeight: 900, fontSize: 11, flexShrink: 0 }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ flex: 1 }}>{opt}</span>
                      {isCorrect && <CheckCircle2 size={17} color="var(--success)" />}
                      {isWrong && <XCircle size={17} color="var(--danger)" />}
                    </button>
                  );
                })}
              </div>

              {checked && (
                <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, background: "rgb(var(--primary-rgb) / 0.07)", border: "1px solid rgb(var(--primary-rgb) / 0.22)" }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
                    AI explanation
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--text)" }}>{q.explanation}</p>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                {!checked ? (
                  <button onClick={check} disabled={selected == null} className="lp-btn-primary" style={{ opacity: selected == null ? 0.5 : 1 }}>
                    Check answer
                  </button>
                ) : (
                  <button onClick={next} className="lp-btn-primary">
                    {index === DEMO_QUESTIONS.length - 1 ? "See my score" : "Next question"} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            <p style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: "var(--text-muted)" }}>
              1,200+ more questions, timed mocks and an AI tutor inside the free account.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

// src/pages/ResultPage.jsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { WhatsAppShareButton, WhatsAppHelpButton } from "../components/WhatsAppShare";

function getResultTier(percentage) {
  if (percentage >= 80) return {
    emoji: "🏆", title: "CHAMPION!", color: "#FFB800",
    message: "Outstanding performance! You're in the top tier. Keep this up on exam day.",
    badge: "Excellence Award",
    confetti: true,
  };
  if (percentage >= 70) return {
    emoji: "🔥", title: "EXCELLENT!", color: "var(--success)",
    message: "Strong result! You're well above average. A little more practice and you're unstoppable.",
    badge: "High Performer",
    confetti: false,
  };
  if (percentage >= 60) return {
    emoji: "👍", title: "GOOD WORK!", color: "#4D9EFF",
    message: "Solid performance. You're getting there. Focus on your weak topics and you'll fly.",
    badge: "On Track",
    confetti: false,
  };
  if (percentage >= 50) return {
    emoji: "📚", title: "KEEP GOING!", color: "var(--accent)",
    message: "You're halfway there. Review the questions you got wrong and practice those topics again.",
    badge: "In Progress",
    confetti: false,
  };
  return {
    emoji: "💪", title: "DON'T GIVE UP!", color: "#FF6B6B",
    message: "Every expert was once a beginner. Review the explanations carefully and try again — you'll improve.",
    badge: "Keep Practicing",
    confetti: false,
  };
}

// Confetti component (CSS only, no package needed):
const CONFETTI_COLORS = ["#FFB800", "var(--success)", "#FF6B6B", "#4D9EFF", "var(--accent)"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      top: "-20px",
      width: `${6 + Math.random() * 8}px`,
      height: `${6 + Math.random() * 8}px`,
      background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      animation: `confettiFall ${1.5 + Math.random() * 2}s ${Math.random() * 0.5}s ease-in forwards`,
      transform: `rotate(${Math.random() * 360}deg)`,
    }))
  );
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9999, overflow: "hidden" }}>
      {pieces.map((p, i) => (
        <div key={i} style={{ position: "absolute", ...p }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          to { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Inside ResultPage component, use like this:
export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result } = location.state || {};
  const { toast } = useToast();

  useEffect(() => {
    if (!result) { navigate("/dashboard"); return; }
    const tier = getResultTier(result.percentageScore);
    const timer = setTimeout(() => {
      toast({ message: `${tier.emoji} ${tier.title} — ${Math.round(result.percentageScore)}% scored`, type: "success", duration: 5000 });
    }, 500);
    return () => clearTimeout(timer);
  }, [navigate, result, toast]);

  if (!result) return null;

  const tier = getResultTier(result.percentageScore);
  const percentage = Math.round(result.percentageScore);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "24px 16px" }}>
      {tier.confetti && <Confetti />}

      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Hero score card */}
        <div style={{
          background: "var(--bg-2)", borderRadius: 20,
          border: `2px solid ${tier.color}44`,
          padding: "40px 24px", textAlign: "center",
          marginBottom: 20, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 4,
            background: tier.color,
          }} />

          <div style={{ fontSize: 64, marginBottom: 8 }}>{tier.emoji}</div>
          <h1 style={{ color: tier.color, fontSize: 28, fontWeight: 900, marginBottom: 4 }}>
            {tier.title}
          </h1>
          <div style={{
            fontSize: 72, fontWeight: 900, color: "var(--text)",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
            marginBottom: 8,
          }}>
            {percentage}%
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 16 }}>
            {result.correctAnswers} correct out of {result.totalQuestions} questions
          </p>

          {/* Badge */}
          <span style={{
            display: "inline-block", padding: "6px 16px", borderRadius: 20,
            background: `${tier.color}22`, border: `1px solid ${tier.color}`,
            color: tier.color, fontSize: 13, fontWeight: 700, marginBottom: 20,
          }}>
            🏅 {tier.badge}
          </span>

          {/* Message */}
          <div style={{
            background: "var(--bg-3)", borderRadius: 12, padding: "16px",
            borderLeft: `3px solid ${tier.color}`,
          }}>
            <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
              "{tier.message}"
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Correct", value: result.correctAnswers, color: "var(--success)" },
            { label: "Wrong", value: result.totalQuestions - result.correctAnswers, color: "var(--danger)" },
            { label: "Time", value: `${Math.floor((result.timeSpentSeconds || 0) / 60)}m`, color: "var(--accent)" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "var(--bg-2)", borderRadius: 14, padding: "16px 12px",
              textAlign: "center", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                {s.value}
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Question review - Detailed */}
        {result.questionLog && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ color: "var(--text)", fontWeight: 800, marginBottom: 12 }}>Question Review</h3>
            {result.questionLog.map((q, i) => (
              <div key={i} style={{
                background: "var(--bg-2)", borderRadius: 12, padding: 16,
                marginBottom: 12, border: `1px solid ${q.isCorrect ? "var(--success)22" : "var(--danger)22"}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    Question {i + 1} · {q.topic || q.subject}
                  </span>
                  <span style={{ 
                    padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 800,
                    background: q.isCorrect ? "var(--success)22" : "var(--danger)22",
                    color: q.isCorrect ? "var(--success)" : "var(--danger)"
                  }}>
                    {q.isCorrect ? "CORRECT" : "INCORRECT"}
                  </span>
                </div>
                
                {/* Show question if available in log */}
                {q.question && (
                  <p style={{ color: "var(--text)", fontWeight: 600, fontSize: 15, marginBottom: 12, lineHeight: 1.5 }}>
                    {q.question}
                  </p>
                )}

                {/* Options */}
                {q.options && (
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    {Object.entries(q.options).map(([opt, val]) => {
                      const isUserAnswer = opt === q.userAnswer;
                      const isCorrect = opt === q.correctAnswer;
                      let bg = "var(--bg-3)";
                      let border = "var(--border)";
                      let textColor = "var(--text)";
                      
                      if (q.isCorrect) {
                        if (isCorrect) {
                          bg = "var(--success)22";
                          border = "var(--success)";
                        }
                      } else {
                        if (isCorrect) {
                          bg = "var(--success)22";
                          border = "var(--success)";
                        } else if (isUserAnswer) {
                          bg = "var(--danger)22";
                          border = "var(--danger)";
                        }
                      }
                      
                      return (
                        <div key={opt} style={{
                          padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${border}`,
                          background: bg, display: "flex", gap: 10, alignItems: "center"
                        }}>
                          <span style={{ 
                            fontWeight: 800, fontSize: 13,
                            color: isCorrect ? "var(--success)" : isUserAnswer ? "var(--danger)" : "var(--text-muted)"
                          }}>
                            {opt}
                          </span>
                          <span style={{ fontSize: 14, color: textColor }}>{val}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Explanation */}
                {q.explanation && (
                  <div style={{ 
                    padding: 12, borderRadius: 8, background: "var(--primary-dim)", 
                    borderLeft: "3px solid var(--primary)"
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "var(--primary)", marginBottom: 6, textTransform: "uppercase" }}>
                      Explanation
                    </div>
                    <p style={{ color: "var(--text)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Share Card - Show for good scores */}
          {percentage >= 60 && (
            <WhatsAppShareButton
              result={{ percentageScore: percentage, correctAnswers: result.correctAnswers, totalQuestions: result.totalQuestions, timeSpentSeconds: result.timeSpentSeconds }}
              type="result"
              style={{ width: "100%", justifyContent: "center" }}
            />
          )}

          <WhatsAppHelpButton
            subject={result.questionLog?.[0]?.topic || result.questionLog?.[0]?.subject || "my exams"}
            score={percentage}
            style={{ width: "100%", justifyContent: "center" }}
          />
          
          <button onClick={() => navigate("/select")} style={{
            padding: 16, borderRadius: 12, background: "var(--primary)", border: "none",
            color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
          }}>
            Practice Again 🔄
          </button>
          <button onClick={() => navigate("/dashboard")} style={{
            padding: 16, borderRadius: 12, background: "var(--bg-2)",
            border: "1px solid var(--border)", color: "var(--text)",
            fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
          }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRandomQuestions } from "../data/questions/compat";
import { doc, updateDoc, addDoc, collection, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { updateStreak } from "../lib/userProfile";
import { logActivity } from "../lib/activityLog";
import { ArrowLeft, RotateCcw, ChevronDown, ChevronUp, Target, Zap, Clock, CheckCircle2, XCircle } from "lucide-react";
import { WhatsAppShareButton } from "../components/WhatsAppShare";
import ReviewPrompt from "../components/ReviewPrompt";
import { shouldAskReview } from "../lib/community";

const SCORE_COLORS = { low: "#FF4D6A", mid: "#FF9F43", good: "var(--success)", elite: "var(--accent)" };

function getScoreColor(score) {
  if (score < 200) return SCORE_COLORS.low;
  if (score < 250) return SCORE_COLORS.mid;
  if (score < 320) return SCORE_COLORS.good;
  return SCORE_COLORS.elite;
}

function getGrade(percentage) {
  if (percentage >= 75) return { letter: "A1", color: "#4ADE80" };
  if (percentage >= 70) return { letter: "B2", color: "#4ADE80" };
  if (percentage >= 65) return { letter: "B3", color: "#A8E6A0" };
  if (percentage >= 60) return { letter: "C4", color: "#FF9F43" };
  if (percentage >= 55) return { letter: "C5", color: "#FF9F43" };
  if (percentage >= 50) return { letter: "C6", color: "#FF9F43" };
  if (percentage >= 45) return { letter: "D7", color: "#FF6B6B" };
  if (percentage >= 40) return { letter: "E8", color: "#FF6B6B" };
  return { letter: "F9", color: "#FF4D6A" };
}

export default function MockSummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state;
  const [displayXP, setDisplayXP] = useState(0);
  const [reviewMode, setReviewMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewKey, setReviewKey] = useState(null);

  useEffect(() => {
    if (!data) { navigate("/dashboard", { replace: true }); return; }
    const target = data.xpEarned || 0;
    let cur = 0, step = 0;
    const int = setInterval(() => { step++; cur = Math.min(Math.ceil((target / 60) * step), target); setDisplayXP(cur); if (step >= 60) clearInterval(int); }, 25);
    return () => clearInterval(int);
    // Intentionally mount-only: the XP count-up animation must not restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!data || !user || saved) return;
    async function save() {
      try {
        if (db) {
          await addDoc(collection(db, "mockExams"), { userId: user.uid, examType: data.examType, subjects: data.subjects, overallScore: data.overallScore, jamb400Score: data.jamb400Score, subjectBreakdown: data.subjectBreakdown, totalQuestions: data.totalQuestions, timeUsed: data.timeUsed, xpEarned: data.xpEarned, weakTopics: data.weakTopics, completedAt: serverTimestamp() });
          await updateDoc(doc(db, "users", user.uid), { mockExamsCompleted: increment(1), totalXP: increment(data.xpEarned || 0), totalQuestionsAnswered: increment(data.totalQuestions), lastActive: serverTimestamp() });
        }
        logActivity({ action: "mock_exam_complete", userId: user.uid, email: user.email, details: { examType: data.examType, overallScore: data.overallScore, jamb400Score: data.jamb400Score, correct: data.correct, total: data.totalQuestions } });
        await updateStreak(user.uid);
        setSaved(true);
        setReviewKey(`mock-${Date.now()}`);
      } catch (e) { console.warn("Save mock error:", e); }
    }
    save();
  }, [data, user, saved]);

  if (!data) return null;

  const { examType, subjects, questions, answers, overallScore, jamb400Score, correct, wrong, skipped, totalQuestions, timeUsed, weakTopics, subjectBreakdown } = data;
  const color = getScoreColor(jamb400Score);
  const grade = getGrade(overallScore);
  const strongSubject = subjects?.length ? subjects.reduce((a, b) => (subjectBreakdown?.[a]?.score || 0) > (subjectBreakdown?.[b]?.score || 0) ? a : b) : "";
  const weakSubject = subjects?.length ? subjects.reduce((a, b) => (subjectBreakdown?.[a]?.score || 100) < (subjectBreakdown?.[b]?.score || 100) ? a : b) : "";

  function handleRetake() { const allQs = []; subjects.forEach(s => { const qs = getRandomQuestions(s, 45); allQs.push(...qs); }); navigate("/practice", { state: { questions: allQs.sort(() => Math.random() - 0.5), subject: subjects.join(", "), mode: "practice" } }); }

  const avgSeconds = Math.round(timeUsed / totalQuestions);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Score ring */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 16px" }}>
            <svg width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="78" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="90" cy="90" r="78" fill="none" stroke={color} strokeWidth="10" strokeDasharray={`${(overallScore / 100) * 490} 490`} strokeLinecap="round" transform="rotate(-90 90 90)" style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>{overallScore}%</span>
              <span style={{ fontSize: 13, fontWeight: 600, color }}>{grade.letter}</span>
            </div>
          </div>
          {examType === "JAMB UTME" && (
            <div style={{ fontSize: 22, fontWeight: 800, color }}>JAMB Score: {jamb400Score}/400</div>
          )}
          <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>{correct} correct · {wrong} wrong · {skipped} skipped</div>
        </div>

        {/* Subject breakdown table */}
        {subjects?.length > 0 && (
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Subject Breakdown</div>
            {subjects.map((s, i) => {
              const sb = subjectBreakdown?.[s] || { correct: 0, wrong: 0, skipped: 0, score: 0 };
              const g = getGrade(sb.score);
              return (
                <div key={s} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 60px", gap: 8, padding: "12px 16px", background: i % 2 === 0 ? "var(--bg-2)" : "var(--bg)", alignItems: "center", fontSize: 13 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)" }}>{s}</div>
                  <div style={{ color: "#4ADE80" }}>{sb.correct}</div>
                  <div style={{ color: "#FF4D6A" }}>{sb.wrong}</div>
                  <div style={{ color: "var(--text-muted)" }}>{sb.skipped}</div>
                  <div style={{ color: "var(--text)", fontWeight: 700 }}>{sb.score}%</div>
                  <div style={{ padding: "2px 8px", borderRadius: 6, background: `${g.color}22`, color: g.color, fontWeight: 700, fontSize: 12, textAlign: "center" }}>{g.letter}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Performance analysis */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { icon: <Target size={16} />, label: "Strongest Subject", value: strongSubject, badge: "green" },
            { icon: <Zap size={16} />, label: "Needs Work", value: weakSubject, badge: "red" },
            { icon: <Clock size={16} />, label: "Avg Time/Question", value: `${avgSeconds}s`, badge: null },
            { icon: <CheckCircle2 size={16} />, label: "XP Earned", value: `+${displayXP}`, badge: "gold" },
          ].map((item, i) => (
            <div key={i} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{item.icon} {item.label}</div>
              <div style={{ fontWeight: 700, color: "var(--text)", fontSize: 16 }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Weak topics */}
        {weakTopics?.length > 0 && (
          <div style={{ background: "rgba(255,77,106,0.05)", border: "1px solid rgba(255,77,106,0.15)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FF6B6B", margin: "0 0 8px" }}>Topics to Review</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...new Set(weakTopics)].map(t => (
                <button key={t} onClick={() => navigate("/practice", { state: { questions: getRandomQuestions(subjects?.[0] || "Biology", 10), subject: subjects?.[0] || "Biology", mode: "practice" } })} style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#FF6B6B", fontSize: 12, cursor: "pointer" }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Review toggle */}
        {questions && (
          <>
            <button onClick={() => setReviewMode(!reviewMode)} className="fold-toggle" aria-expanded={reviewMode}>
              {reviewMode ? <ChevronUp size={18} /> : <ChevronDown size={18} />} {reviewMode ? "Hide" : "Review All Answers"}
            </button>
            <div className={reviewMode ? "fold-body fold-open" : "fold-body"} style={{ marginBottom: reviewMode ? 24 : 0 }}>
              <div>
                <div>
                  {questions.map((q, i) => {
                    const ua = answers?.[q.id];
                    const isCorrect = ua === q.answer;
                    return (
                      <div key={q.id} className={`fold-card ${isCorrect ? "fold-card-correct" : "fold-card-wrong"}`} style={{ marginBottom: 8 }}>
                        <div className="fold-header" style={{ padding: 14, paddingBottom: 6, alignItems: "flex-start", cursor: "default" }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Q{i + 1} · {q.subject} · {q.topic}</span>
                          {isCorrect ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, padding: "0 14px 8px", lineHeight: 1.4 }}>{q.question}</p>
                        <div style={{ padding: "0 14px 14px", display: "grid", gap: 3 }}>
                          {Object.entries(q.options).map(([k, v]) => (
                            <div key={k} className={`fold-opt ${k === q.answer ? "fold-opt-correct" : k === ua && k !== q.answer ? "fold-opt-wrong" : "fold-opt-muted"}`}>
                              <span style={{ fontWeight: 700 }}>{k}:</span> {v}
                              {k === q.answer && <CheckCircle2 size={12} color="var(--success)" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={handleRetake} style={{ padding: 14, borderRadius: 12, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}><RotateCcw size={18} style={{ verticalAlign: "middle", marginRight: 8 }} /> Retake Exam</button>
          {weakTopics?.length > 0 && <button onClick={() => navigate("/practice", { state: { questions: getRandomQuestions(subjects?.[0] || "Biology", 10), subject: subjects?.[0] || "Biology", mode: "practice" } })} style={{ padding: 14, borderRadius: 12, background: "var(--bg-2)", border: "1px solid #333", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Practice Weak Topics</button>}
          <button onClick={() => navigate("/dashboard")} style={{ padding: 14, borderRadius: 12, background: "var(--bg-2)", border: "1px solid #333", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}><ArrowLeft size={18} style={{ verticalAlign: "middle", marginRight: 8 }} /> Back to Dashboard</button>
          <WhatsAppShareButton
            result={{ percentageScore: overallScore || 0, correctAnswers: correct || 0, totalQuestions: totalQuestions || 0, timeSpentSeconds: timeUsed || 0 }}
            type="mock"
            style={{ width: "100%", justifyContent: "center" }}
          />
        </div>
      </div>
      {saved && reviewKey && shouldAskReview(reviewKey) && (
        <ReviewPrompt sessionId={reviewKey} context={`${examType || "Mock"} · ${overallScore || 0}%`} />
      )}
    </div>
  );
}
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { getRandomQuestions } from "../data/questions/compat";
import { doc, updateDoc, addDoc, collection, increment, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { updateStreak } from "../lib/userProfile";
import { logActivity } from "../lib/activityLog";
import { summarizeSessionGroq, heuristicSummary, getAIErrorIfRecent } from "../lib/ai";
import { bufferSummary, flushMemory } from "../lib/aiMemory";
import { useSubscription } from "../hooks/useSubscription";
import { ArrowLeft, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { WhatsAppShareButton, WhatsAppHelpButton } from "../components/WhatsAppShare";
import ReviewPrompt from "../components/ReviewPrompt";
import { shouldAskReview } from "../lib/community";

export default function SessionSummary() {
  const { user } = useAuth();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const data = location.state;
  const [displayXP, setDisplayXP] = useState(0);
  const [expandedReview, setExpandedReview] = useState(null);
  const animRef = useRef(null);
  const [saved, setSaved] = useState(false);
  const [reviewKey, setReviewKey] = useState(null);
  const { sendNotification } = useNotifications();

  useEffect(() => {
    if (!data) { navigate("/dashboard", { replace: true }); return; }

    // XP animation
    const target = data.xpEarned || 0;
    const duration = 1500;
    const steps = 60;
    const incrementVal = target / steps;
    let current = 0;
    let step = 0;

    animRef.current = setInterval(() => {
      step++;
      current = Math.min(Math.round(incrementVal * step), target);
      setDisplayXP(current);
      if (step >= steps) clearInterval(animRef.current);
    }, duration / steps);

    return () => { if (animRef.current) clearInterval(animRef.current); };
    // Intentionally mount-only: the XP count-up animation must not restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to Firestore once
  useEffect(() => {
    if (!data || !user || saved) return;
    async function saveSession() {
      try {
        if (db) {
          // Compact per-question log powers teacher heatmaps (capped, no full text)
          const questionLog = Array.isArray(data.questions)
            ? data.questions.slice(0, 60).map((q) => ({
                t: q.topic || "General",
                s: q.subject || data.subject || "General",
                ok: data.answers?.[q.id] === q.answer,
              }))
            : [];
          try {
            await addDoc(collection(db, "sessions"), {
              userId: user.uid,
              subject: data.subject,
              score: data.score,
              correct: data.correct,
              wrong: data.wrong,
              total: data.total,
              timeSeconds: data.timeSeconds,
              xpEarned: data.xpEarned,
              weakTopics: data.weakTopics || [],
              questionLog,
              completedAt: serverTimestamp(),
            });
          } catch (e) {
            console.warn("Session save failed, using local:", e?.message);
          }
          try {
            await updateDoc(doc(db, "users", user.uid), {
              totalQuestionsAnswered: increment(data.total),
              totalSessions: increment(1),
              totalXP: increment(data.xpEarned || 0),
              lastActive: serverTimestamp(),
            });
          } catch (e) {
            console.warn("User stats update failed:", e?.message);
          }
        }

        await updateStreak(user.uid);
        setSaved(true);
        setReviewKey(`session-${Date.now()}`);

        // Session memory: Pro → Groq summary; free → instant heuristic.
        // Buffered + flushed in one write; never blocks the summary screen.
        (async () => {
          try {
            const input = {
              subject: data.subject,
              correct: data.correct,
              total: data.total,
              weakTopics: data.weakTopics || [],
            };
            let summary = null;
            if (isPro) {
              try {
                summary = await summarizeSessionGroq(input);
              } catch (e) {
                const aiErr = getAIErrorIfRecent();
                console.warn("Groq summary failed, using heuristic:", aiErr?.message || e.message);
                summary = heuristicSummary(input);
              }
            } else {
              summary = heuristicSummary(input);
            }
            if (summary) {
              bufferSummary(user.uid, summary);
              await flushMemory(user.uid);
            }
          } catch (e) {
            console.warn("Session summary skipped:", e?.message);
          }
        })();

        logActivity({ action: "session_complete", userId: user.uid, email: user.email, details: { subject: data.subject, score: data.score, correct: data.correct, total: data.total, xp: data.xpEarned } });

        // Notify on completion
        sendNotification({
          title: "Session Complete!",
          body: `${data?.subject || "Session"}: ${data?.score || 0}% (${data?.correct || 0}/${data?.total || 0} correct)`,
          url: "/dashboard",
          tag: "session-complete",
        });
      } catch (e) {
        console.warn("Failed to save session:", e);
      }
    }
    saveSession();
    // Run once per session payload; `saved` guards against duplicate writes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user, saved]);

  if (!data) return null;

  const { subject, mode, questions, answers, correct, wrong, score, timeSeconds, weakTopics } = data;
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "F";
  const headline = score >= 80 ? "Excellent! 🔥" : score >= 60 ? "Good effort! 💪" : "Keep pushing! 📚";
  const conicColor = score >= 80 ? "#4ADE80" : score >= 60 ? "var(--accent)" : score >= 40 ? "#FF9F43" : "#FF4D6A";

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  function handlePracticeAgain() {
    const newQs = getRandomQuestions(subject === "Mixed" ? questions?.[0]?.subject || "Biology" : subject, 10);
    navigate("/practice", { state: { questions: newQs, subject, mode } });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", padding: "32px 24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        
        {/* Score ring */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ position: "relative", width: 160, height: 160, margin: "0 auto 16px" }}>
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle cx="80" cy="80" r="70" fill="none" stroke={conicColor} strokeWidth="10" strokeDasharray={`${(score / 100) * 440} 440`} strokeLinecap="round" transform="rotate(-90 80 80)" style={{ transition: "stroke-dasharray 1s ease" }} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: "var(--text)" }}>{score}%</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: conicColor }}>Grade {grade}</span>
            </div>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{headline}</h2>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Correct", value: correct, color: "#4ADE80" },
            { label: "Wrong", value: wrong, color: "#FF4D6A" },
            { label: "Time", value: formatTime(timeSeconds), color: "var(--primary)" },
            { label: "XP", value: `+${displayXP}`, color: "var(--accent)" },
          ].map((s, i) => (
            <div key={i} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weak topics */}
        {weakTopics?.length > 0 && (
          <div style={{ background: "rgba(255,77,106,0.05)", border: "1px solid rgba(255,77,106,0.15)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#FF6B6B", margin: "0 0 8px" }}>Topics to Review</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...new Set(weakTopics)].map(t => (
                <span key={t} style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,77,106,0.1)", border: "1px solid rgba(255,77,106,0.2)", color: "#FF6B6B", fontSize: 12, cursor: "pointer" }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Question review */}
        {questions && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Question Review</h3>
            {questions.map((q, i) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.answer;
              const isExpanded = expandedReview === q.id;
              return (
                <div key={q.id} className={`fold-card fold${isExpanded ? " fold-open" : ""} ${isCorrect ? "fold-card-correct" : "fold-card-wrong"}`}
                  style={{ cursor: "pointer", marginBottom: 8 }}
                  onClick={() => setExpandedReview(isExpanded ? null : q.id)}>
                  <div className="fold-header" style={{ padding: 14, paddingBottom: 4, alignItems: "flex-start" }} role="button" tabIndex={0}
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedReview(isExpanded ? null : q.id); } }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Q{i + 1} · {q.topic}</span>
                    {isCorrect ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: 0, padding: "0 16px 8px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: isExpanded ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.question}</p>
                  <div className="fold-body">
                    <div>
                      <div style={{ padding: "6px 16px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {Object.entries(q.options).map(([k, v]) => (
                          <div key={k} className={`fold-opt ${k === q.answer ? "fold-opt-correct" : k === userAns && k !== q.answer ? "fold-opt-wrong" : "fold-opt-muted"}`}>
                            <span style={{ fontWeight: 700 }}>{k}:</span> {v}
                          </div>
                        ))}
                        {q.explanation && (
                          <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: "rgb(var(--primary-rgb) / 0.1)", borderLeft: "2px solid var(--primary)", fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{q.explanation}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={handlePracticeAgain} style={{ padding: 14, borderRadius: 12, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "inherit" }}>
            <RotateCcw size={18} /> Practice Again
          </button>
          <button onClick={() => navigate("/dashboard")} style={{ padding: 14, borderRadius: 12, background: "var(--bg-2)", border: "1px solid #333", color: "var(--text)", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
            <ArrowLeft size={18} style={{ verticalAlign: "middle", marginRight: 8 }} /> Back to Dashboard
          </button>
          <WhatsAppShareButton
            result={{ percentageScore: data?.score || 0, correctAnswers: data?.correct || 0, totalQuestions: data?.total || 0, timeSpentSeconds: data?.timeSeconds || 0 }}
            type="result"
            style={{ width: "100%", justifyContent: "center" }}
          />
          <WhatsAppHelpButton
            subject={data?.subject || "my exams"}
            score={data?.score || 0}
            style={{ width: "100%", justifyContent: "center" }}
          />
        </div>
      </div>
      {saved && reviewKey && shouldAskReview(reviewKey) && (
        <ReviewPrompt sessionId={reviewKey} context={`${data?.subject || "Practice"} · ${data?.score || 0}%`} />
      )}
    </div>
  );
}
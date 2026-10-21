import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import { checkQuestionLimit, trackQuestion, checkAILimit } from "../lib/usageTracker";
import { explainQuestion, getAIErrorIfRecent } from "../lib/ai";
import { bufferInteraction, flushMemory } from "../lib/aiMemory";
import { motivatorFor } from "../data/wellness";
import ProUpgradeModal from "../components/ProUpgradeModal";
import { Whiteboard } from "../components/Whiteboard";
import NotepadDrawer from "../components/NotepadDrawer";
import { useHint } from "../hooks/useHints";
import { ChevronRight, Sparkles, AlertCircle, CheckCircle2, XCircle, Flag, BookOpen, Lightbulb, PenTool, NotebookPen } from "lucide-react";

const MODE_MOCK = "mock";
const MODE_PRACTICE = "practice";

export default function PracticeSession() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionData = location.state;

  const [showProModal, setShowProModal] = useState(false);
  const [proReason, setProReason] = useState(null);
  const [questions, setQuestions] = useState(sessionData?.questions || []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [redirected, setRedirected] = useState(false);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [revealed, setRevealed] = useState({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingAI, setLoadingAI] = useState(null);
  const [showHint, setShowHint] = useState({});
  const [sessionComplete, setSessionComplete] = useState(false);
  const [limitBlocked, setLimitBlocked] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [eliminated, setEliminated] = useState({});
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [notepadOpen, setNotepadOpen] = useState(false);
  const timerRef = useRef(null);

  const sessionId = sessionData?.startTime || "practice_session";
  const hintState = useHint(sessionId);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mode = sessionData?.mode || MODE_PRACTICE;
  const subject = sessionData?.subject || "Mixed";
  const totalTime = mode === MODE_MOCK ? 1800 : Infinity;
  const current = questions[currentIndex];

  useEffect(() => {
    if (!sessionData?.questions?.length && !redirected) {
      setRedirected(true);
      toast({ message: "Select a subject to start practicing", type: "warning" });
      navigate("/question-bank", { replace: true });
      return;
    }

    async function checkLimit() {
      if (!user || isPro) return;
      try {
        const check = await checkQuestionLimit(user.uid);
        if (!check.allowed) {
          setLimitBlocked(true);
          setProReason("questions");
          toast({ message: "Daily question limit reached. Upgrade to Pro!", type: "warning" });
        }
      } catch (e) {
        console.warn("Failed to check question limit:", e);
      }
    }
    checkLimit();
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed(t => {
        if (mode === MODE_MOCK && t >= totalTime) {
          clearInterval(timerRef.current);
          return totalTime;
        }
        return t + 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    if (mode === MODE_MOCK && timeElapsed >= totalTime && !sessionComplete) {
      finishSession();
    }
  }, [timeElapsed, mode, totalTime, sessionComplete]);

  useEffect(() => {
    if (sessionComplete || !questions.length) return;
    const sessionState = {
      questions,
      answers,
      currentIndex,
      subject,
      mode,
      startTime: sessionData?.startTime || Date.now(),
    };
    const timer = setTimeout(() => {
      try { localStorage.setItem("exampadi_active_session", JSON.stringify(sessionState)); } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [answers, currentIndex, questions, subject, mode, sessionComplete, sessionData]);

  useEffect(() => {
    if (sessionComplete) {
      try { localStorage.removeItem("exampadi_active_session"); } catch {}
    }
  }, [sessionComplete]);

  useEffect(() => {
    function handleKey(e) {
      if (sessionComplete || limitBlocked) return;
      const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D" };
      if (keyMap[e.key] && current && !revealed[current.id]) {
        e.preventDefault();
        handleSelect(keyMap[e.key]);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, revealed, sessionComplete, limitBlocked]);

  const formatTime = useCallback((secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, []);

  const progressPct = ((currentIndex + 1) / questions.length) * 100;

  function handleSelect(optionKey) {
    if (revealed[current?.id] || sessionComplete) return;
    if (current?.kind === "theory") return; // theory uses its own writer UI
    setAnswers(prev => {
      const next = { ...prev, [current.id]: optionKey };
      // Mid-activity motivation: every 5th answered question
      const answered = Object.keys(next).length;
      if (answered > 0 && answered % 5 === 0 && answered < questions.length) {
        setTimeout(() => {
          toast({ message: motivatorFor(Date.now(), answered), type: "info" });
        }, 600);
      }
      return next;
    });
    setRevealed(prev => ({ ...prev, [current.id]: true }));

    if (user && !isPro) {
      trackQuestion(user.uid);
    }
    // Buffer for AI memory (in-memory only — flushed once at session end)
    if (user && current) {
      bufferInteraction(user.uid, {
        topic: current.topic,
        subject: current.subject || subject,
        correct: optionKey === current.answer,
        questionText: current.question,
      });
    }
  }

  async function handleAskAI() {
    try {
      if (!isPro) {
        const limit = await checkAILimit(user?.uid);
        if (!limit.allowed) { setProReason("ai"); setShowProModal(true); return; }
      }

      if (loadingAI) return;
      setLoadingAI(current.id);

      const explanation = await explainQuestion({
        question: current.question,
        options: current.options,
        correctAnswer: current.answer,
        userAnswer: answers[current.id],
        subject: current.subject,
        topic: current.topic,
      });

      const aiErr = getAIErrorIfRecent();
      if (aiErr) {
        setAiExplanations(prev => ({ ...prev, [current.id]: `⚠️ AI unavailable: ${aiErr.message}` }));
        toast({ message: `AI explanation failed: ${aiErr.message}`, type: "error" });
      } else {
        setAiExplanations(prev => ({ ...prev, [current.id]: explanation }));
      }
      setLoadingAI(null);
    } catch (e) {
      console.error("AI explanation failed:", e);
      if (e?.code === "AI_LIMIT") {
        setProReason("ai");
        setShowProModal(true);
        toast({ message: e.message, type: "warning" });
      } else {
        toast({ message: "Failed to get AI explanation. Please try again.", type: "error" });
      }
      setLoadingAI(null);
    }
  }

  function toggleFlag() {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id); else next.add(current.id);
      return next;
    });
  }

  function goToQuestion(idx) {
    if (idx >= 0 && idx < questions.length) setCurrentIndex(idx);
  }

  function handleUseHint() {
    if (!current || revealed[current.id]) return;
    if (current.kind === "theory") {
      toast({ message: "No hints on theory — compare with the model answer", type: "info" });
      return;
    }
    if (!hintState.canUse) {
      toast({ message: "No hints remaining this session", type: "warning" });
      return;
    }

    const correctKey = current.answer;
    const optionKeys = Object.keys(current.options).filter(k => k !== correctKey);
    const alreadyEliminated = eliminated[current.id] || [];

    const available = optionKeys.filter(k => !alreadyEliminated.includes(k));
    if (available.length < 2) {
      toast({ message: "Not enough wrong answers to eliminate", type: "info" });
      return;
    }

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);

    if (hintState.use()) {
      setEliminated(prev => ({
        ...prev,
        [current.id]: [...(prev[current.id] || []), ...toEliminate],
      }));
      toast({ message: `Hint used! ${hintState.remaining - 1} hints remaining`, type: "success" });
    }
  }

  function finishSession() {
    if (timerRef.current) clearInterval(timerRef.current);

    // Theory questions are self-reviewed, never scored
    const scored = questions.filter(q => q.kind !== "theory");
    const theoryReviewed = questions.filter(q => q.kind === "theory" && answers[q.id]).length;
    const correct = scored.filter(q => answers[q.id] === q.answer).length;
    const wrong = scored.filter(q => answers[q.id] && answers[q.id] !== q.answer).length;
    const unanswered = scored.length - Object.keys(answers).filter(id => scored.some(q => q.id === id)).length;
    const pct = scored.length > 0 ? Math.round((correct / scored.length) * 100) : 100;
    const xp = correct * 5 + Object.keys(answers).length * 2 + theoryReviewed * 2 + (pct >= 80 ? 10 : 0);

    const weakTopics = scored
      .filter(q => answers[q.id] && answers[q.id] !== q.answer)
      .map(q => q.topic);

    setSessionComplete(true);
    hintState.reset();
    // Flush buffered AI-memory interactions (single Firestore write)
    if (user) flushMemory(user.uid).catch(() => {});
    navigate("/session-summary", {
      state: {
        subject,
        mode,
        questions,
        answers,
        correct,
        wrong,
        unanswered,
        total: questions.length,
        score: pct,
        timeSeconds: timeElapsed,
        xpEarned: xp,
        weakTopics: [...new Set(weakTopics)],
        hintsUsed: hintState.used,
      }
    });
  }

  function handleClosePro() {
    setShowProModal(false);
    if (limitBlocked) navigate("/dashboard");
  }

  function handleConfirmEnd() {
    const unanswered = Object.keys(answers).length;
    if (unanswered < questions.length) {
      toast({ message: `You have ${questions.length - unanswered} unanswered questions. End anyway?`, type: "info" });
    }
    finishSession();
  }

  function getOptionStyle(key) {
    const base = { padding: "14px 16px", borderRadius: 12, border: "1.5px solid #333", background: "var(--bg-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.25s ease", textAlign: "left", fontFamily: "inherit" };
    const selected = answers[current?.id] === key;
    const isCorrect = key === current?.answer;
    const isEliminated = eliminated[current?.id]?.includes(key);

    if (isEliminated) {
      return { ...base, opacity: 0.2, pointerEvents: "none", textDecoration: "line-through" };
    }

    if (!revealed[current?.id]) {
      if (selected) return { ...base, border: "1.5px solid var(--primary)", background: "rgb(var(--primary-rgb) / 0.2)" };
      return base;
    }

    if (selected && isCorrect) return { ...base, border: "1.5px solid #4ADE80", background: "rgba(74,222,128,0.15)" };
    if (selected && !isCorrect) return { ...base, border: "1.5px solid #FF4D6A", background: "rgba(255,77,106,0.15)" };
    if (isCorrect) return { ...base, border: "1.5px solid #4ADE80", background: "rgba(74,222,128,0.08)" };
    return { ...base, opacity: 0.5 };
  }

  function getBadgeStyle(key) {
    const selected = answers[current?.id] === key;
    const isCorrect = key === current?.answer;
    if (!revealed[current?.id] && selected) return { background: "var(--primary)", color: "#fff" };
    if (revealed[current?.id] && isCorrect) return { background: "#4ADE80", color: "#000" };
    if (revealed[current?.id] && selected && !isCorrect) return { background: "#FF4D6A", color: "#fff" };
    return { background: "var(--border)", color: "var(--text-muted)" };
  }

  if (limitBlocked) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24, fontFamily: "'Inter', system-ui, sans-serif", padding: 24, textAlign: "center" }}>
        <AlertCircle size={48} color="#FF4D6A" />
        <h2 style={{ color: "var(--text)", fontWeight: 700, fontSize: 22, margin: 0 }}>Daily Limit Reached</h2>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Upgrade to Pro for unlimited questions</p>
        <button onClick={() => { setShowProModal(true); setProReason("questions"); }} style={{ padding: "12px 28px", borderRadius: 10, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
          Upgrade Now
        </button>
        <ProUpgradeModal open={showProModal} onClose={() => { setShowProModal(false); navigate("/dashboard"); }} reason="questions" dismissible />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", minHeight: "100vh" }}>
        
        {/* Left Panel */}
        <div style={{ flex: 1, padding: "20px 24px", maxWidth: isDesktop ? "calc(100% - 220px)" : "100%" }}>
          {/* Progress + Timer */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--primary)", borderRadius: 3, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>{currentIndex + 1}/{questions.length}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace", minWidth: 60, textAlign: "right" }}>{formatTime(timeElapsed)}</span>
          </div>

          {current && (
            <>
              {/* Question header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <span style={{ padding: "4px 12px", borderRadius: 8, background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 700 }}>Q{currentIndex + 1}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{current.subject} · {current.topic}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: current.difficulty === "easy" ? "#4ADE80" : current.difficulty === "medium" ? "#FF9F43" : "#FF4D6A" }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{current.difficulty}</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    onClick={handleUseHint}
                    disabled={!!revealed[current.id] || !hintState.canUse}
                    style={{ padding: "4px 12px", borderRadius: 8, background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: hintState.canUse && !revealed[current.id] ? "var(--accent)" : "var(--text-muted)", cursor: hintState.canUse && !revealed[current.id] ? "pointer" : "not-allowed", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <Lightbulb size={12} /> Use Hint ({hintState.remaining})
                  </button>
                  <button
                    onClick={() => setWhiteboardOpen(true)}
                    style={{ padding: "4px 12px", borderRadius: 8, background: "rgb(var(--primary-rgb) / 0.1)", border: "1px solid rgb(var(--primary-rgb) / 0.3)", color: "var(--primary)", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <PenTool size={12} /> Whiteboard
                  </button>
                </div>
              </div>

              {/* Question text */}
              <h2 style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.6, marginBottom: 24, margin: "0 0 24px", color: "#fff" }}>{current.question}</h2>

              {current.kind === "theory" ? (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    📝 Theory — write your answer, then compare
                  </div>
                  <textarea
                    value={typeof answers[current.id] === "string" && answers[current.id] !== "REVIEWED" ? answers[current.id] : ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [current.id]: e.target.value.slice(0, 2000) }))}
                    disabled={!!revealed[current.id]}
                    rows={5}
                    placeholder="Write your answer here…"
                    style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-2)", border: "1px solid #333", color: "#fff", fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                  />
                  {!revealed[current.id] ? (
                    <button onClick={() => { setAnswers(prev => ({ ...prev, [current.id]: prev[current.id] || "REVIEWED" })); setRevealed(prev => ({ ...prev, [current.id]: true })); }}
                      style={{ marginTop: 12, padding: "10px 20px", borderRadius: 10, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                      Show model answer
                    </button>
                  ) : (
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "rgb(var(--accent-rgb) / 0.08)", borderLeft: "3px solid var(--accent)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>MODEL ANSWER — compare honestly</div>
                      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{current.modelAnswer || current.explanation}</p>
                    </div>
                  )}
                </div>
              ) : (
              <>
              {/* Options */}
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", gap: 10, marginBottom: 24 }}>
                {Object.entries(current.options).map(([key, val]) => (
                  <button key={key} onClick={() => handleSelect(key)} style={getOptionStyle(key)} disabled={!!revealed[current.id] || eliminated[current.id]?.includes(key)}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, ...getBadgeStyle(key), fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{key}</span>
                    <span style={{ fontSize: 14, flex: 1 }}>{val}</span>
                    {revealed[current.id] && key === current.answer && <CheckCircle2 size={18} color="#4ADE80" />}
                    {revealed[current.id] && answers[current.id] === key && key !== current.answer && <XCircle size={18} color="#FF4D6A" />}
                  </button>
                ))}
              </div>
              </>
              )}

              {/* After reveal */}
              {revealed[current.id] && (
                <div style={{ marginBottom: 24 }}>
                  {/* Hint */}
                  {current.hint && (
                    <div style={{ marginBottom: 12 }}>
                      <button onClick={() => setShowHint(s => ({ ...s, [current.id]: !s[current.id] }))} style={{ padding: "8px 16px", borderRadius: 8, background: "rgb(var(--accent-rgb) / 0.1)", border: "1px solid rgb(var(--accent-rgb) / 0.3)", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
                        💡 {showHint[current.id] ? "Hide Hint" : "Show Hint"}
                      </button>
                      {showHint[current.id] && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--accent)", fontStyle: "italic" }}>{current.hint}</p>}
                    </div>
                  )}

                  {/* AI Explain */}
                  <button onClick={handleAskAI} disabled={loadingAI === current.id} style={{ padding: "10px 20px", borderRadius: 8, background: "transparent", border: "1.5px solid var(--primary)", color: "var(--primary)", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                    <Sparkles size={16} /> {loadingAI === current.id ? "Loading..." : "Ask AI to Explain"}
                  </button>

                  {aiExplanations[current.id] && (
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 10, background: "var(--bg)", borderLeft: "3px solid var(--primary)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}><Sparkles size={14} /> AI Explanation</div>
                      <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, margin: 0 }}>{aiExplanations[current.id]}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Nav buttons */}
              <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={toggleFlag} style={{ padding: "8px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${flagged.has(current.id) ? "var(--accent)" : "var(--border)"}`, color: flagged.has(current.id) ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 13, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                  <Flag size={14} /> {flagged.has(current.id) ? "Flagged" : "Flag Question"}
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  {currentIndex < questions.length - 1 ? (
                    <button onClick={() => goToQuestion(currentIndex + 1)} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontFamily: "inherit" }}>
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button onClick={handleConfirmEnd} style={{ padding: "10px 20px", borderRadius: 8, background: "#FF4D6A", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}>
                      Finish Session
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Panel - Navigator */}
        {isDesktop && (
          <div style={{ width: 220, background: "var(--bg)", borderLeft: "1px solid var(--border)", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Questions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {questions.map((q, i) => {
                const isCurrent = i === currentIndex;
                const isAnswered = answers[q.id];
                const isFlagged = flagged.has(q.id);
                let bg = "var(--bg-3)";
                let border = "1px solid #333";
                if (isCurrent) { bg = "var(--bg-3)"; border = "1.5px solid #fff"; }
                if (isAnswered) { bg = "rgb(var(--primary-rgb) / 0.2)"; border = "1px solid var(--primary)"; }
                if (isFlagged) { bg = "rgb(var(--accent-rgb) / 0.15)"; border = "1px solid var(--accent)"; }
                if (isCurrent && isAnswered) { bg = "rgb(var(--primary-rgb) / 0.25)"; border = "1.5px solid #fff"; }

                return (
                  <button key={q.id} onClick={() => goToQuestion(i)} style={{ width: 32, height: 32, borderRadius: 6, background: bg, border, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "rgb(var(--primary-rgb) / 0.2)", border: "1px solid var(--primary)" }} /> Answered</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)" }}><div style={{ width: 8, height: 8, borderRadius: 2, background: "rgb(var(--accent-rgb) / 0.15)", border: "1px solid var(--accent)" }} /> Flagged</div>
            </div>
            <button onClick={handleConfirmEnd} style={{ marginTop: "auto", padding: "10px", borderRadius: 8, background: "transparent", border: "1px solid #FF4D6A", color: "#FF4D6A", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              End Session
            </button>
          </div>
        )}
      </div>

      {/* Whiteboard toggle FAB */}
      <button
        onClick={() => setWhiteboardOpen(true)}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9998,
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--primary)", border: "none", color: "#fff", cursor: "pointer",
          display: whiteboardOpen ? "none" : "flex",
          alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgb(var(--primary-rgb) / 0.5)",
        }}
        title="Whiteboard & Calculator"
      >
        <PenTool size={22} />
      </button>

      <button
        onClick={() => setNotepadOpen(true)}
        style={{
          position: "fixed", bottom: 84, right: 24, zIndex: 9998,
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}
        title="Notepad & AI"
      >
        <NotebookPen size={20} />
      </button>

      <Whiteboard open={whiteboardOpen} onClose={() => setWhiteboardOpen(false)} />
      <NotepadDrawer open={notepadOpen} onClose={() => setNotepadOpen(false)} context={current?.question || ""} />

      <ProUpgradeModal open={showProModal} onClose={handleClosePro} reason={proReason} dismissible />
    </div>
  );
}

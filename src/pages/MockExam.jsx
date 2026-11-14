import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import { getUserProfile } from "../lib/userProfile";
import { getRandomQuestions } from "../data/questions/compat";
import ProUpgradeModal from "../components/ProUpgradeModal";
import Scratchpad from "../components/Scratchpad";
import { recordSession } from "../lib/aiMemory";
import { Clock, Flag, ChevronLeft, ChevronRight, AlertTriangle, Calculator } from "lucide-react";

const EXAM_CONFIG = {
  "JAMB UTME": { duration: 7200, questionsPerSubject: 45, maxSubjects: 4 },
  "WAEC SSCE": { duration: 10800, questionsPerSubject: 60, maxSubjects: 9 },
  "POST-UTME": { duration: 3600, questionsPerSubject: 100, maxSubjects: 1 },
};

export default function MockExam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [step, setStep] = useState("setup");
  const [examType, setExamType] = useState("JAMB UTME");
  const [selectedSubjects, setSelectedSubjects] = useState(["English"]);
  const [difficulty, setDifficulty] = useState("official");
  const [showProModal, setShowProModal] = useState(false);

  // Exam state
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [warningShown, setWarningShown] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (user) getUserProfile(user.uid).then(p => { setProfile(p); if (p?.subjects?.length) setSelectedSubjects([p.subjects[0]]); }).catch(e => { console.warn("Failed to load profile:", e); });
  }, [user]);

  const userSubjects = profile?.subjects || [];
  const config = EXAM_CONFIG[examType];
  const duration = config?.duration || 7200;

  function handleExamType(val) {
    setExamType(val);
    setSelectedSubjects(["English"]);
  }

  function toggleSubject(subj) {
    const max = config?.maxSubjects || 4;
    setSelectedSubjects(prev => {
      if (prev.includes(subj)) return prev.filter(s => s !== subj);
      if (prev.length >= max) return prev;
      return [...prev, subj];
    });
  }

  function isSubjectDisabled(subj) {
    const max = config?.maxSubjects || 4;
    return selectedSubjects.length >= max && !selectedSubjects.includes(subj);
  }

  function beginExam() {
    if (selectedSubjects.length === 0) { toast({ message: "Select at least one subject", type: "warning" }); return; }
    const allQs = [];
    const diffFilter = difficulty === "official" ? null : difficulty;
    selectedSubjects.forEach(s => {
      const qs = getRandomQuestions(s, config?.questionsPerSubject || 45);
      allQs.push(...qs);
    });
    const filtered = diffFilter ? allQs.filter(q => q.difficulty === diffFilter) : allQs;
    const shuffled = (filtered.length > 0 ? filtered : allQs).sort(() => Math.random() - 0.5);

    setQuestions(shuffled);
    setTimeRemaining(duration);
    setExamStarted(true);
    setStep("exam");
  }

  // Timer — refs avoid stale closure
  const questionsRef = useRef(questions);
  const answersRef = useRef(answers);
  const flaggedRef = useRef(flagged);
  const selectedSubjectsRef = useRef(selectedSubjects);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { flaggedRef.current = flagged; }, [flagged]);
  useEffect(() => { selectedSubjectsRef.current = selectedSubjects; }, [selectedSubjects]);

  function handleAutoSubmit() {
    toast({ message: "Time's up! Submitting your exam...", type: "info" });
    const qs = questionsRef.current;
    const ans = answersRef.current;
    const subs = selectedSubjectsRef.current;
    if (!qs.length) return;
    const correct = qs.filter(q => ans[q.id] === q.answer).length;
    const wrong = qs.filter(q => ans[q.id] && ans[q.id] !== q.answer).length;
    const skipped = qs.length - Object.keys(ans).length;
    const pct = Math.round((correct / qs.length) * 100);
    const jambScore = Math.round((correct / qs.length) * 400);
    const xp = correct * 5 + (pct >= 80 ? 50 : pct >= 60 ? 25 : 0);
    const weakTopics = qs.filter(q => ans[q.id] && ans[q.id] !== q.answer).map(q => q.topic);
    const subjectBreakdown = {};
    subs.forEach(s => {
      const sq = qs.filter(q => q.subject === s);
      const c = sq.filter(q => ans[q.id] === q.answer).length;
      const w = sq.filter(q => ans[q.id] && ans[q.id] !== q.answer).length;
      subjectBreakdown[s] = { correct: c, wrong: w, skipped: sq.length - c - w, score: sq.length > 0 ? Math.round((c / sq.length) * 100) : 0 };
    });
    if (user) recordSession(user.uid, qs, ans, "answer").catch(() => {});
    navigate("/mock-summary", {
      state: {
        examType, subjects: subs, questions: qs, answers: ans,
        overallScore: pct, jamb400Score: jambScore, correct, wrong, skipped,
        totalQuestions: qs.length, timeUsed: duration,
        xpEarned: xp, weakTopics: [...new Set(weakTopics)], subjectBreakdown,
        flaggedIds: [...flaggedRef.current],
      }
    });
  }

  useEffect(() => {
    if (!examStarted || examSubmitted) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); handleAutoSubmit(); return 0; }
        if (prev === 900 && !warningShown) {
          setWarningShown(true);
          toast({ message: "⏰ 15 minutes remaining! Review flagged questions.", type: "info" });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [examStarted, examSubmitted]);

  function submitExam() {
    if (timerRef.current) clearInterval(timerRef.current);
    setExamSubmitted(true);

    const correct = questions.filter(q => answers[q.id] === q.answer).length;
    const wrong = questions.filter(q => answers[q.id] && answers[q.id] !== q.answer).length;
    const skipped = questions.length - Object.keys(answers).length;
    const pct = Math.round((correct / questions.length) * 100);
    const jambScore = Math.round((correct / questions.length) * 400);
    const xp = correct * 5 + (pct >= 80 ? 50 : pct >= 60 ? 25 : 0);

    const weakTopics = questions.filter(q => answers[q.id] && answers[q.id] !== q.answer).map(q => q.topic);

    const subjectBreakdown = {};
    selectedSubjects.forEach(s => {
      const sq = questions.filter(q => q.subject === s);
      const c = sq.filter(q => answers[q.id] === q.answer).length;
      const w = sq.filter(q => answers[q.id] && answers[q.id] !== q.answer).length;
      subjectBreakdown[s] = { correct: c, wrong: w, skipped: sq.length - c - w, score: Math.round((c / sq.length) * 100) };
    });

    if (user) recordSession(user.uid, questions, answers, "answer").catch(() => {});
    navigate("/mock-summary", {
      state: {
        examType, subjects: selectedSubjects, questions, answers,
        overallScore: pct, jamb400Score: jambScore, correct, wrong, skipped,
        totalQuestions: questions.length, timeUsed: duration - timeRemaining,
        xpEarned: xp, weakTopics: [...new Set(weakTopics)], subjectBreakdown,
        flaggedIds: [...flagged],
      }
    });
  }

  function formatTime(secs) {
    const m = Math.floor(secs / 60); const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  const timerColor = timeRemaining < 300 ? "#FF4D6A" : timeRemaining < 900 ? "#FF9F43" : "#fff";
  const current = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  if (step === "setup") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)", padding: "32px 24px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 560, width: "100%", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 24, padding: "32px 28px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px", textAlign: "center" }}>Mock Exam Mode</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", margin: "0 0 24px" }}>Real exam conditions, timed to the minute</p>

          {/* Exam type */}
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>Exam Type</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {Object.keys(EXAM_CONFIG).map(e => (
              <button key={e} onClick={() => handleExamType(e)} style={{ flex: 1, padding: "10px", borderRadius: 10, border: examType === e ? "2px solid var(--primary)" : "1px solid #333", background: examType === e ? "rgb(var(--primary-rgb) / 0.15)" : "var(--bg-3)", color: examType === e ? "#fff" : "var(--text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {e}
              </button>
            ))}
          </div>

          {/* Subjects */}
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>Subjects (max {config?.maxSubjects})</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {userSubjects.map(s => {
              const sel = selectedSubjects.includes(s);
              const disabled = isSubjectDisabled(s);
              return (
                <button key={s} onClick={() => !disabled && toggleSubject(s)} disabled={disabled && !sel} style={{ padding: "8px 14px", borderRadius: 8, border: sel ? "2px solid var(--primary)" : "1px solid #333", background: sel ? "rgb(var(--primary-rgb) / 0.2)" : disabled ? "var(--bg)" : "var(--bg-3)", color: sel ? "#fff" : disabled ? "var(--text-muted)" : "var(--text)", fontWeight: sel ? 600 : 400, fontSize: 12, cursor: disabled && !sel ? "not-allowed" : "pointer", opacity: disabled && !sel ? 0.5 : 1 }}>
                  {s}
                </button>
              );
            })}
          </div>

          {/* Info cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div style={{ background: "var(--bg-3)", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Duration</div><div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{Math.floor(duration / 60)} mins</div></div>
            <div style={{ background: "var(--bg-3)", borderRadius: 10, padding: 12, textAlign: "center" }}><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Questions</div><div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{selectedSubjects.length * (config?.questionsPerSubject || 45)}</div></div>
          </div>

          {/* Difficulty */}
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, display: "block" }}>Difficulty</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[
              { id: "official", label: "Official Mix" },
              { id: "hard", label: "Hard Mode" },
              { id: "easy", label: "Easy Warmup" },
            ].map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: difficulty === d.id ? "2px solid var(--primary)" : "1px solid #333", background: difficulty === d.id ? "rgb(var(--primary-rgb) / 0.15)" : "var(--bg-3)", color: difficulty === d.id ? "#fff" : "var(--text-muted)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Warning */}
          <div style={{ background: "#1a1400", border: "1px solid var(--accent)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertTriangle size={18} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ color: "var(--accent)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>Once started, the timer cannot be paused. Answers cannot be changed after submission. Exactly like exam day.</p>
          </div>

          {/* CTA */}
          <div style={{ position: "relative" }}>
            <button onClick={beginExam} disabled={selectedSubjects.length === 0} style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: selectedSubjects.length > 0 ? "linear-gradient(135deg, var(--primary), var(--accent))" : "var(--border)", color: selectedSubjects.length > 0 ? "#fff" : "var(--text-muted)", fontWeight: 700, fontSize: 16, cursor: selectedSubjects.length > 0 ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
              Begin Exam →
            </button>
            {!isPro && <ProUpgradeModal open={showProModal} onClose={() => setShowProModal(false)} reason="mock" dismissible />}
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const unanswered = questions.length - answeredCount;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter', system-ui, sans-serif", color: "var(--text)" }}>
      {/* Top bar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "var(--bg)", borderBottom: "1px solid var(--border)", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: "linear-gradient(135deg, var(--primary), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>E</div>
            <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 6, background: "rgb(var(--primary-rgb) / 0.15)", color: "var(--primary)", fontWeight: 600 }}>{examType}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Clock size={16} color={timerColor} style={timeRemaining < 300 ? { animation: "pulse 1s infinite" } : {}} />
            <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: timerColor, letterSpacing: 1 }}>{formatTime(timeRemaining)}</span>
          </div>
          <button onClick={() => setShowSubmitModal(true)} style={{ padding: "8px 18px", borderRadius: 8, background: "transparent", border: "1.5px solid #FF4D6A", color: "#FF4D6A", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Submit Exam
          </button>
        </div>
        {/* Subject tabs */}
        {selectedSubjects.length > 1 && (
          <div style={{ display: "flex", gap: 4, padding: "0 20px 8px", overflowX: "auto" }}>
            {selectedSubjects.map(s => {
              const sq = questions.filter(q => q.subject === s);
              const c = sq.filter(q => answers[q.id]).length;
              const isActive = current.subject === s;
              return (
                <button key={s} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: isActive ? "rgb(var(--primary-rgb) / 0.2)" : "transparent", cursor: "pointer", borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent", color: isActive ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "inherit" }}>
                  {s} ({c}/{sq.length})
                </button>
              );
            })}
          </div>
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }`}</style>

      {/* Main content */}
      <div style={{ display: "flex", paddingTop: 96, minHeight: "100vh" }}>
        <div style={{ flex: 1, padding: "20px 24px", maxWidth: 800, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500, marginBottom: 16 }}>Question {currentIndex + 1} of {questions.length}</div>
          <div style={{ background: "var(--bg-2)", border: `1px solid ${flagged.has(current.id) ? "var(--accent)" : "var(--border)"}`, borderRadius: 16, padding: 20, position: "relative", transition: "border 0.2s" }}>
            <button onClick={() => setFlagged(prev => { const n = new Set(prev); n.has(current.id) ? n.delete(current.id) : n.add(current.id); return n; })} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: 18 }} title="Flag for review">
              <Flag size={18} color={flagged.has(current.id) ? "var(--accent)" : "var(--text-muted)"} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.6, margin: "0 0 20px", color: "#fff", paddingRight: 40 }}>{current.question}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(current.options).map(([key, val]) => {
                const sel = answers[current.id] === key;
                return (
                  <button key={key} onClick={() => setAnswers(prev => prev[current.id] === key ? { ...prev, [current.id]: undefined } : { ...prev, [current.id]: key })} style={{ padding: "14px 16px", borderRadius: 12, border: sel ? "2px solid var(--primary)" : "1.5px solid #333", background: sel ? "rgb(var(--primary-rgb) / 0.2)" : "var(--bg-3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", fontFamily: "inherit" }}>
                    <span style={{ width: 28, height: 28, borderRadius: 8, background: sel ? "var(--primary)" : "var(--border)", color: sel ? "#fff" : "var(--text-muted)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{key}</span>
                    <span style={{ fontSize: 14, color: "var(--text)" }}>{val}</span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(i => i - 1)} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: currentIndex === 0 ? "var(--text-muted)" : "#fff", cursor: currentIndex === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
              <ChevronLeft size={16} /> Previous
            </button>
            {currentIndex < questions.length - 1 ? (
              <button onClick={() => setCurrentIndex(i => i + 1)} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={() => setShowSubmitModal(true)} style={{ padding: "10px 20px", borderRadius: 8, background: "#FF4D6A", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Submit Exam
              </button>
            )}
          </div>
        </div>

        {/* Navigator sidebar */}
        <div style={{ width: 200, background: "var(--bg)", borderLeft: "1px solid var(--border)", padding: 20, position: "fixed", right: 0, top: 96, bottom: 0, overflowY: "auto" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Answered: {answeredCount}/{questions.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 4, marginBottom: 12 }}>
            {questions.map((q, i) => {
              const a = answers[q.id]; const f = flagged.has(q.id);
              let bg = "var(--bg-3)"; let border = "1px solid #333";
              if (i === currentIndex) border = "1.5px solid #fff";
              if (a) { bg = "var(--primary)"; border = "1px solid var(--primary)"; }
              if (f) { bg = "var(--accent)"; border = "1px solid var(--accent)"; }
              return (
                <button key={q.id} onClick={() => setCurrentIndex(i)} style={{ width: 32, height: 32, borderRadius: 6, background: bg, border, color: a || f ? "#000" : "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Flagged: {flagged.size}</div>
        </div>
      </div>

      {/* Scratchpad FAB — movable rough-work panel (never covers the question) */}
      <button
        onClick={() => setScratchpadOpen(true)}
        title="Scratchpad — rough work & calculator"
        style={{
          position: "fixed", bottom: 24, right: 220, zIndex: 9998,
          width: 48, height: 48, borderRadius: "50%",
          background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text)",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
        }}
      >
        <Calculator size={20} />
      </button>
      <Scratchpad open={scratchpadOpen} onClose={() => setScratchpadOpen(false)} context={current?.question || ""} />

      {/* Submit modal */}
      {showSubmitModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 20, padding: "28px 24px", maxWidth: 420, width: "90%", textAlign: "center" }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "0 0 12px" }}>Submit Exam?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: "#4ADE80" }}>{answeredCount}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Answered</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-muted)" }}>{unanswered}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Unanswered</div></div>
              <div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>{flagged.size}</div><div style={{ fontSize: 11, color: "var(--text-muted)" }}>Flagged</div></div>
            </div>
            <p style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 20 }}>You cannot change answers after submission.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { const idx = questions.findIndex(q => flagged.has(q.id)); if (idx >= 0) setCurrentIndex(idx); setShowSubmitModal(false); }} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Review Flagged
              </button>
              <button onClick={submitExam} style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#FF4D6A", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Submit Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  getActiveAssignment,
  startAssignment,
  submitAssignment,
  createAssignment,
} from "../lib/assignmentSystem";
import { addXp } from "../lib/xpSystem";
import { Whiteboard, useWhiteboard } from "../components/Whiteboard";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  PenTool,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trophy,
} from "lucide-react";

const TIME_LIMIT = 1500;

export default function AssignmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isOpen, toggle, canvasRef, clear } = useWhiteboard();

  const [step, setStep] = useState("loading");
  const [assignment, setAssignment] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(TIME_LIMIT);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const active = getActiveAssignment(user.uid);
    if (active) {
      if (active.status === "pending") {
        const started = startAssignment(user.uid, active.id);
        // Hydrate the active assignment from storage on entry.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAssignment(started);
        setStep("exam");
      } else if (active.status === "active") {
        setAssignment(active);
        const elapsed = Math.floor((Date.now() - active.startedAt) / 1000);
        const remaining = Math.max(0, TIME_LIMIT - elapsed);
        setTimeRemaining(remaining);
        setStep("exam");
      }
    } else {
      setStep("none");
    }
  }, [user]);

  const handleSubmit = useCallback(() => {
    if (!user || !assignment) return;
    if (timerRef.current) clearInterval(timerRef.current);
    const answerArray = assignment.questions.map((_, i) => answers[i] || null);
    const res = submitAssignment(user.uid, assignment.id, answerArray);
    setResult(res);
    setStep("results");
    if (res.score >= 35) {
      addXp(user.uid, 30, "assignment_pass");
      toast({ message: "Assignment passed! +30 XP", type: "success" });
    } else {
      toast({ message: "Assignment failed. Try again!", type: "error" });
    }
  }, [user, assignment, answers, toast]);

  useEffect(() => {
    if (step !== "exam" || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        if (prev === 300) {
          toast({ message: "5 minutes remaining!", type: "warning" });
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // handleSubmit is invoked from the ticking interval; re-creating the timer
    // whenever `answers` changes would reset the countdown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const handleRequestAssignment = useCallback(() => {
    if (!user) return;
    const weakSubjects = ["Mathematics", "English", "Physics"];
    const subject = weakSubjects[Math.floor(Math.random() * weakSubjects.length)];
    const newAssignment = createAssignment(user.uid, subject, []);
    if (newAssignment) {
      const started = startAssignment(user.uid, newAssignment.id);
      setAssignment(started);
      setStep("exam");
      toast({ message: "Assignment generated!", type: "success" });
    }
  }, [user, toast]);

  const handleRetry = useCallback(() => {
    setStep("none");
    setAssignment(null);
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setTimeRemaining(TIME_LIMIT);
    setHintsUsed(0);
  }, []);

  const handleUseHint = useCallback(() => {
    if (hintsUsed >= 5 || !assignment) return;
    setHintsUsed((h) => h + 1);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 3000);
  }, [hintsUsed, assignment]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (step === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (step === "none") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "rgb(var(--primary-rgb) / 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <AlertTriangle size={32} color="var(--primary)" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>
            No Active Assignment
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
            Request a new assignment based on your weakest subject. 25 questions, 25 minutes, 35% to pass.
          </p>
          <div
            style={{
              background: "var(--bg-3)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Time Limit</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>25 minutes</span>
          </div>
          <div
            style={{
              background: "var(--bg-3)",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Questions</span>
            <span style={{ color: "var(--text)", fontWeight: 600 }}>25</span>
          </div>
          <div
            style={{
              background: "#1a1400",
              border: "1px solid var(--accent)",
              borderRadius: 12,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <AlertTriangle
              size={16}
              color="var(--accent)"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <p style={{ color: "var(--accent)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You need at least 35% to pass. If you fail, a new assignment will be generated automatically.
            </p>
          </div>
          <button
            onClick={handleRequestAssignment}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Request Assignment
          </button>
        </div>
      </div>
    );
  }

  if (step === "results" && result) {
    const passed = result.score >= 35;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "var(--text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 440,
            width: "100%",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: "40px 28px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: passed
                ? "rgba(74,222,128,0.15)"
                : "rgba(255,77,106,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            {passed ? (
              <Trophy size={36} color="#4ADE80" />
            ) : (
              <XCircle size={36} color="#FF4D6A" />
            )}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
            {passed ? "Assignment Passed!" : "Assignment Failed"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
            {passed
              ? "Great work! You earned 30 XP."
              : "You need at least 35% to pass. A new assignment has been generated."}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: "var(--bg-3)",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: passed ? "#4ADE80" : "#FF4D6A",
                }}
              >
                {result.score}%
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Score</div>
            </div>
            <div
              style={{
                background: "var(--bg-3)",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)" }}>
                {result.correctCount}/{result.questions.length}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Correct</div>
            </div>
          </div>

          {passed && (
            <div
              style={{
                background: "rgba(74,222,128,0.1)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <CheckCircle size={18} color="#4ADE80" />
              <span style={{ color: "#4ADE80", fontWeight: 600, fontSize: 14 }}>
                +30 XP Earned
              </span>
            </div>
          )}

          {!passed && (
            <button
              onClick={handleRetry}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "#fff",
                fontWeight: 700,
                fontSize: 16,
                cursor: "pointer",
                fontFamily: "inherit",
                marginBottom: 12,
              }}
            >
              Retry Assignment
            </button>
          )}

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "1px solid #333",
              background: "transparent",
              color: "var(--text-muted)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === "exam" && assignment) {
    const current = assignment.questions[currentIndex];
    const answeredCount = Object.keys(answers).length;
    const timerColor =
      timeRemaining < 300 ? "#FF4D6A" : timeRemaining < 600 ? "#FF9F43" : "var(--text)";

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          fontFamily: "'Inter', system-ui, sans-serif",
          color: "var(--text)",
        }}
      >
        <style>{`
          @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        `}</style>

        {/* Top bar */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "var(--bg)",
            borderBottom: "1px solid var(--border)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 14,
                }}
              >
                E
              </div>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 10px",
                  borderRadius: 6,
                  background: "rgb(var(--primary-rgb) / 0.15)",
                  color: "var(--primary)",
                  fontWeight: 600,
                }}
              >
                {assignment.subject}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Clock
                size={16}
                color={timerColor}
                style={timeRemaining < 300 ? { animation: "pulse 1s infinite" } : {}}
              />
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: timerColor,
                  letterSpacing: 1,
                }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={toggle}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: isOpen ? "rgb(var(--primary-rgb) / 0.2)" : "transparent",
                  border: isOpen ? "1.5px solid var(--primary)" : "1.5px solid #333",
                  color: isOpen ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <PenTool size={14} /> Whiteboard
              </button>
              <button
                onClick={() => {
                  if (timerRef.current) clearInterval(timerRef.current);
                  handleSubmit();
                }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1.5px solid #FF4D6A",
                  color: "#FF4D6A",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: "flex", paddingTop: 72, minHeight: "100vh" }}>
          <div
            style={{
              flex: 1,
              padding: "20px 24px",
              maxWidth: isOpen ? "50%" : 800,
              margin: "0 auto",
              transition: "max-width 0.3s",
            }}
          >
            {/* Progress */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                Question {currentIndex + 1} of {assignment.questions.length}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {answeredCount} answered
              </span>
            </div>

            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: 3,
                background: "var(--border)",
                borderRadius: 2,
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${((currentIndex + 1) / assignment.questions.length) * 100}%`,
                  background: "var(--primary)",
                  borderRadius: 2,
                  transition: "width 0.3s",
                }}
              />
            </div>

            {/* Question card */}
            <div
              style={{
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 24,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 17,
                  fontWeight: 600,
                  lineHeight: 1.6,
                  margin: "0 0 24px",
                  color: "var(--text)",
                }}
              >
                {current.question}
              </p>

              {current.explanation && showHint && (
                <div
                  style={{
                    background: "rgb(var(--accent-rgb) / 0.1)",
                    border: "1px solid rgb(var(--accent-rgb) / 0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    fontSize: 13,
                    color: "var(--accent)",
                    lineHeight: 1.5,
                  }}
                >
                  <Lightbulb size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Hint: {current.explanation ? current.explanation.substring(0, 80) + "..." : "Think about the underlying concept before choosing."}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(current.options).map(([key, val]) => {
                  const sel = answers[currentIndex] === key;
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        setAnswers((prev) =>
                          prev[currentIndex] === key
                            ? { ...prev, [currentIndex]: undefined }
                            : { ...prev, [currentIndex]: key }
                        )
                      }
                      style={{
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: sel ? "2px solid var(--primary)" : "1.5px solid #333",
                        background: sel ? "rgb(var(--primary-rgb) / 0.2)" : "var(--bg-3)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        textAlign: "left",
                        fontFamily: "inherit",
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: sel ? "var(--primary)" : "var(--border)",
                          color: sel ? "#fff" : "var(--text-muted)",
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {key}
                      </span>
                      <span style={{ fontSize: 14, color: "var(--text)" }}>{val}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hint button */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <button
                onClick={handleUseHint}
                disabled={hintsUsed >= 5}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: hintsUsed >= 5 ? "var(--bg-3)" : "rgb(var(--accent-rgb) / 0.1)",
                  color: hintsUsed >= 5 ? "var(--text-muted)" : "var(--accent)",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: hintsUsed >= 5 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Lightbulb size={14} /> Hint ({5 - hintsUsed} left)
              </button>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((i) => i - 1);
                  setShowHint(false);
                }}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "var(--bg-3)",
                  border: "1px solid #333",
                  color: currentIndex === 0 ? "var(--text-muted)" : "var(--text)",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              {currentIndex < assignment.questions.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentIndex((i) => i + 1);
                    setShowHint(false);
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "var(--primary)",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleSubmit();
                  }}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 8,
                    background: "#FF4D6A",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Submit Assignment
                </button>
              )}
            </div>
          </div>

          {/* Question navigator sidebar */}
          <div
            style={{
              width: 180,
              background: "var(--bg)",
              borderLeft: "1px solid var(--border)",
              padding: 16,
              position: "fixed",
              right: isOpen ? "50%" : 0,
              top: 72,
              bottom: 0,
              overflowY: "auto",
              transition: "right 0.3s",
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              Answered: {answeredCount}/{assignment.questions.length}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 4,
                marginBottom: 12,
              }}
            >
              {assignment.questions.map((_, i) => {
                const a = answers[i];
                let bg = "var(--bg-3)";
                let border = "1px solid #333";
                if (i === currentIndex) border = "1.5px solid #fff";
                if (a) {
                  bg = "var(--primary)";
                  border = "1px solid var(--primary)";
                }
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentIndex(i);
                      setShowHint(false);
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: bg,
                      border,
                      color: a ? "#000" : "var(--text)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Whiteboard overlay */}
        {isOpen && (
          <div
            style={{
              position: "fixed",
              top: 72,
              right: 0,
              width: "50%",
              bottom: 0,
              background: "#fff",
              zIndex: 40,
              borderLeft: "1px solid var(--border)",
            }}
          >
            <Whiteboard isOpen={isOpen} onClose={toggle} canvasRef={canvasRef} onClear={clear} />
          </div>
        )}
      </div>
    );
  }

  return null;
}

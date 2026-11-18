import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getQuestionsFromBank } from "../data/questions/compat";
import { submitSharedTest, getSharedTest } from "../lib/studyPartners";
import { Clock, Trophy, ArrowRight } from "lucide-react";

export default function SharedTestPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const test = location.state?.test;

  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState(null);
  const [partnerResults, setPartnerResults] = useState(null);

  useEffect(() => {
    if (!test) { navigate("/study-partners"); return; }
    const qs = getQuestionsFromBank({ subject: test.subject, count: test.questionCount || 10 });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize test state from route data
    setQuestions(qs);
    setTimeLeft(test.timeLimit);
    // Load partner results if test is completed
    if (test.status === "completed") {
      const pr = test[`results_${test.partnerUid || test.creatorUid}`];
      if (pr) setPartnerResults(pr);
    }
  }, [test, navigate]);

  useEffect(() => {
    if (finished || timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [finished, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 && !finished && questions.length > 0) {
      handleFinish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once when the timer reaches zero
  }, [timeLeft]);

  const handleAnswer = useCallback((qId, letter) => {
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
  }, []);

  async function handleFinish() {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) correct++;
    });
    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const timeSeconds = test.timeLimit - timeLeft;
    const res = { score, correct, total, timeSeconds };

    try {
      await submitSharedTest(test.id, user.uid, res);
      setResults(res);
      setFinished(true);
      // Reload test to get partner results
      const updated = await getSharedTest(test.id);
      if (updated) {
        const pr = updated[`results_${test.partnerUid || test.creatorUid}`];
        if (pr) setPartnerResults(pr);
      }
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (questions.length === 0) return null;

  if (finished && results) {
    return (
      <div style={{ padding: "24px 16px", maxWidth: 500, margin: "0 auto", paddingTop: 80 }}>
        <div style={{
          textAlign: "center", padding: 32, borderRadius: 20,
          background: "rgb(var(--primary-rgb) / 0.08)", border: "1px solid rgb(var(--primary-rgb) / 0.2)",
          marginBottom: 24,
        }}>
          <Trophy size={48} color="#FFD700" style={{ marginBottom: 12 }} />
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Test Complete!</h2>
          <div style={{ fontSize: 48, fontWeight: 900, color: "var(--primary)" }}>{results.score}%</div>
          <div style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 4 }}>
            {results.correct}/{results.total} correct · {formatTime(results.timeSeconds)}
          </div>
        </div>

        {partnerResults && (
          <div style={{
            padding: 20, borderRadius: 16,
            background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)",
            marginBottom: 24,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Partner's Result</h3>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#25D366" }}>{partnerResults.score}%</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
              {partnerResults.correct}/{partnerResults.total} correct · {formatTime(partnerResults.timeSeconds)}
            </div>
            <div style={{
              marginTop: 12, padding: "10px 16px", borderRadius: 12,
              background: results.score > partnerResults.score ? "rgba(52,199,89,0.1)" :
                results.score < partnerResults.score ? "rgba(255,59,48,0.1)" : "rgba(255,204,0,0.1)",
              fontWeight: 700, fontSize: 14,
              color: results.score > partnerResults.score ? "#34c759" :
                results.score < partnerResults.score ? "#ff3b30" : "#ffcc00",
            }}>
              {results.score > partnerResults.score ? "🏆 You won!" :
                results.score < partnerResults.score ? "💪 Partner wins!" : "🤝 It's a tie!"}
            </div>
          </div>
        )}

        {!partnerResults && (
          <div style={{
            padding: 16, borderRadius: 12, textAlign: "center",
            background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", fontSize: 13, marginBottom: 24,
          }}>
            Waiting for partner to complete the test...
          </div>
        )}

        <button
          onClick={() => navigate("/study-partners")}
          style={{
            width: "100%", padding: "14px", borderRadius: 14,
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            color: "#fff", fontWeight: 700, fontSize: 15,
            border: "none", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          Back to Partners <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div style={{ padding: "16px", maxWidth: 500, margin: "0 auto", paddingTop: 80 }}>
      {/* Timer + Progress */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: timeLeft < 60 ? "#ff3b30" : "var(--text)",
        }}>
          <Clock size={16} style={{ verticalAlign: -3 }} /> {formatTime(timeLeft)}
        </span>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {current + 1}/{questions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", marginBottom: 24, overflow: "hidden",
      }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "var(--primary)", borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      {/* Question */}
      <div style={{
        padding: 20, borderRadius: 16,
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.5, marginBottom: 4 }}>
          {q.question}
        </p>
        {q.topic && (
          <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>{q.topic}</span>
        )}
      </div>

      {/* Options */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
        {Object.entries(q.options).map(([letter, text]) => (
          <button
            key={letter}
            onClick={() => handleAnswer(q.id, letter)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 16px", borderRadius: 14,
              background: answers[q.id] === letter
                ? "rgb(var(--primary-rgb) / 0.2)" : "rgba(255,255,255,0.04)",
              border: answers[q.id] === letter
                ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.08)",
              color: "var(--text)", textAlign: "left", cursor: "pointer",
              fontSize: 14, transition: "all 0.2s",
            }}
          >
            <span style={{
              width: 30, height: 30, borderRadius: 8,
              background: answers[q.id] === letter ? "var(--primary)" : "rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {letter}
            </span>
            {text}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: "flex", gap: 12 }}>
        {current > 0 && (
          <button
            onClick={() => setCurrent(current - 1)}
            style={{
              flex: 1, padding: "14px", borderRadius: 14,
              background: "rgba(255,255,255,0.06)", color: "var(--text)",
              fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
            }}
          >
            Back
          </button>
        )}
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(current + 1)}
            style={{
              flex: 1, padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
            }}
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleFinish}
            style={{
              flex: 1, padding: "14px", borderRadius: 14,
              background: "linear-gradient(135deg, #34c759, #25D366)",
              color: "#fff", fontWeight: 700, fontSize: 14, border: "none", cursor: "pointer",
            }}
          >
            Submit Test
          </button>
        )}
      </div>
    </div>
  );
}

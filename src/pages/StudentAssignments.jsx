import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock, Loader2, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  listAssignmentsForStudent, getSubmission, submitAssignment,
} from "../lib/teacherContent";

export default function StudentAssignments() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    document.title = "Assignments — ExamPadi";
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    listAssignmentsForStudent(user.uid, profile?.classIds || [])
      .then((rows) => { if (live) setItems(rows); })
      .catch((e) => toast({ message: e.message || "Could not load assignments", type: "error" }))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user, profile?.classIds, toast]);

  async function open(a) {
    setActive(a);
    setAnswers({});
    setResult(null);
    try {
      setSubmission(await getSubmission(a.id, user.uid));
    } catch {
      setSubmission(null);
    }
  }

  async function submit() {
    if (!active) return;
    const missing = (active.questions || []).filter((q) => answers[q.id] == null);
    if (missing.length) {
      toast({ message: `Answer all questions first (${missing.length} left).`, type: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitAssignment(active.id, user.uid, answers);
      setResult(res);
      toast({ message: "Assignment submitted ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Submit failed", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (active) {
    return (
      <div className="page-content max-w-3xl mx-auto" style={{ paddingTop: 20 }}>
        <button onClick={() => setActive(null)} className="btn-secondary mb-4 flex items-center gap-1.5 text-sm">
          <ArrowLeft size={15} /> All assignments
        </button>
        <div className="glass-card" style={{ padding: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{active.title}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "4px 0 16px" }}>
            {active.teacherName || "Teacher"} · {active.subject || "General"} · {active.questions?.length || 0} questions
          </p>

          {result ? (
            <div style={{ textAlign: "center", padding: "18px 0" }}>
              <div style={{ fontSize: 46, fontWeight: 900, color: "var(--primary)", lineHeight: 1 }}>{result.score}%</div>
              <p style={{ color: "var(--text-muted)", margin: "8px 0 0" }}>
                {result.correctCount} of {result.total} correct. Your teacher can now see your submission.
              </p>
            </div>
          ) : submission ? (
            <div style={{ padding: 16, borderRadius: 10, background: "var(--bg-2)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 800 }}>
                <CheckCircle2 size={17} color="var(--success)" /> Submitted
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
                {submission.status === "graded"
                  ? `Teacher score: ${submission.score ?? "—"}%${submission.remarks ? ` · ${submission.remarks}` : ""}`
                  : "Waiting for your teacher to review."}
              </p>
            </div>
          ) : (
            <>
              {(active.questions || []).map((q, i) => (
                <div key={q.id} style={{ marginBottom: 18 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.55, margin: "0 0 8px" }}>
                    {i + 1}. {q.question}
                  </p>
                  <div style={{ display: "grid", gap: 7 }}>
                    {(q.options || []).map((opt, oi) => {
                      const letter = String.fromCharCode(65 + oi);
                      const picked = answers[q.id] === letter;
                      return (
                        <button
                          key={oi}
                          onClick={() => setAnswers((a) => ({ ...a, [q.id]: letter }))}
                          style={{
                            textAlign: "left", padding: "9px 11px", borderRadius: 8, cursor: "pointer",
                            fontFamily: "inherit", fontSize: 13, color: "var(--text)",
                            background: picked ? "rgb(var(--primary-rgb) / 0.13)" : "var(--bg-2)",
                            border: `1px solid ${picked ? "var(--primary)" : "var(--border)"}`,
                          }}
                        >
                          <strong style={{ marginRight: 7 }}>{letter}.</strong>{opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button onClick={submit} disabled={submitting} className="btn-primary flex items-center gap-2" style={{ opacity: submitting ? 0.6 : 1 }}>
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {submitting ? "Submitting…" : "Submit assignment"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl mx-auto" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Assignments</h1>
      <p style={{ color: "var(--text-muted)", margin: "4px 0 18px", fontSize: 13 }}>
        Homework and class tasks from your teachers.
      </p>

      {loading ? (
        <div style={{ display: "flex", gap: 8, color: "var(--text-muted)", padding: 20 }}>
          <Loader2 size={17} className="animate-spin" /> Loading assignments…
        </div>
      ) : items.length === 0 ? (
        <div className="glass-card" style={{ padding: 30, textAlign: "center" }}>
          <BookOpenCheck size={30} style={{ margin: "0 auto 8px", color: "var(--text-muted)" }} />
          <div style={{ fontWeight: 800 }}>No active assignments</div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "5px 0 0" }}>
            Join a class or ask your teacher to assign work. <Link to="/join" style={{ color: "var(--primary)", fontWeight: 700 }}>Join a class</Link>
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((a) => (
            <button key={a.id} onClick={() => open(a)} className="glass-card" style={{ padding: 16, textAlign: "left", cursor: "pointer", fontFamily: "inherit", color: "var(--text)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    {a.teacherName || "Teacher"} · {a.subject || "General"} · {a.questionCount || a.questions?.length || 0} questions
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
                  <Clock size={13} /> {a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : "No due date"}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

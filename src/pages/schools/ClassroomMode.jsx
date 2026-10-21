// Classroom mode — full-screen presenter for phone-free classrooms.
// Big text, tap-to-reveal answers, works on projectors and laptops.
// Teachers get a live attention board + engagement stats; students get
// "raise hand" requests, polls and "I get it / I'm confused" signals.
//
// Everything is scoped to a classKey so different classes/schools never leak
// into each other. The teacher opens /teacher/classroom?class=<classId>,
// students open /classroom?class=<classId>. With no param we fall back to a
// school-wide room (school_<schoolId>) so a whole school can share one board.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection, query, where, onSnapshot, doc, setDoc, updateDoc,
  increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile } from "../../lib/userProfile";
import { getQuestionsFromBank } from "../../data/questions/compat";
import { JAMB_SUBJECTS } from "../../data/subjects";
import { useToast } from "../../components/Toast";
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Users, HelpCircle,
  MessageSquare, ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import StudentAttention from "../../components/StudentAttention";

// Firestore Timestamps are objects, not numbers — compare via toMillis().
function isRecentlyActive(ts, windowMs = 60000) {
  if (!ts) return false;
  const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms < windowMs;
}

export default function ClassroomMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [profile, setProfile] = useState(undefined);
  const [subject, setSubject] = useState("Physics");
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState(null);
  const [showAttention, setShowAttention] = useState(true);
  const [attentionRequests, setAttentionRequests] = useState([]);
  const [activePolls, setActivePolls] = useState([]);
  const [studentResponses, setStudentResponses] = useState({});
  const [votedPolls, setVotedPolls] = useState({});

  useEffect(() => {
    if (!user) return;
    let live = true;
    getUserProfile(user.uid)
      .then((p) => { if (live) setProfile(p || null); })
      .catch(() => { if (live) setProfile(null); });
    return () => { live = false; };
  }, [user]);

  const isTeacher = profile?.role === "teacher";

  // Stable room key: explicit ?class=<id>, else school-wide, else "default".
  let classKey = "default";
  try {
    const fromQuery = new URLSearchParams(location.search).get("class");
    if (fromQuery && fromQuery.trim()) classKey = fromQuery.trim().slice(0, 80);
    else if (profile?.schoolId) classKey = `school_${profile.schoolId}`;
  } catch { /* ignore malformed query */ }

  useEffect(() => {
    const qs = getQuestionsFromBank({ subject, count: 30 });
    setQuestions(qs || []);
    setIdx(0);
    setRevealed(false);
    setPicked(null);
  }, [subject]);

  // Attention requests for this class (teacher only).
  useEffect(() => {
    if (!isTeacher || !db) return;
    const unsub = onSnapshot(
      query(
        collection(db, "attentionRequests"),
        where("classId", "==", classKey),
        where("resolved", "==", false),
      ),
      (snap) => setAttentionRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setAttentionRequests([]),
    );
    return () => unsub();
  }, [isTeacher, classKey]);

  // Active polls for this class (everyone, so students can vote).
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(
      query(
        collection(db, "classPolls"),
        where("classId", "==", classKey),
        where("active", "==", true),
      ),
      (snap) => setActivePolls(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setActivePolls([]),
    );
    return () => unsub();
  }, [classKey]);

  // Student responses for this class (teacher only).
  useEffect(() => {
    if (!isTeacher || !db) return;
    const unsub = onSnapshot(
      query(collection(db, "classResponses"), where("classId", "==", classKey)),
      (snap) => {
        const responses = {};
        snap.docs.forEach((d) => { const data = d.data(); responses[data.studentUid] = data; });
        setStudentResponses(responses);
      },
      () => setStudentResponses({}),
    );
    return () => unsub();
  }, [isTeacher, classKey]);

  const q = questions[idx];

  function choose(letter) {
    setPicked(letter);
    setRevealed(true);
    if (user && !isTeacher) {
      setDoc(doc(db, "classResponses", `${classKey}_${user.uid}`), {
        studentUid: user.uid,
        studentName: user.displayName || "Student",
        classId: classKey,
        questionIdx: idx,
        answer: letter,
        lastActive: serverTimestamp(),
        questionsAnswered: increment(1),
      }, { merge: true }).catch(() => {});
    }
  }

  function next() {
    setIdx((i) => (i + 1) % Math.max(questions.length, 1));
    setRevealed(false);
    setPicked(null);
  }

  function toggleUnderstood(understood) {
    if (!user || isTeacher) return;
    setDoc(doc(db, "classResponses", `${classKey}_${user.uid}`), {
      studentUid: user.uid,
      studentName: user.displayName || "Student",
      classId: classKey,
      understood,
      lastActive: serverTimestamp(),
    }, { merge: true })
      .then(() => toast({ message: understood ? "Marked as understood" : "Flagged as confused", type: "info" }))
      .catch(() => {});
  }

  async function votePoll(poll, optionIdx) {
    if (!user || isTeacher) return;
    if (votedPolls[poll.id]) { toast({ message: "You already voted", type: "info" }); return; }
    if (optionIdx >= poll.options.length) return;
    setVotedPolls((p) => ({ ...p, [poll.id]: true }));
    try {
      // Only the student's own vote doc is written; the teacher derives the
      // tallies from these votes (clients can't inflate a poll).
      await setDoc(doc(db, "classPollVotes", `${poll.id}_${user.uid}`), {
        pollId: poll.id,
        classId: classKey,
        studentUid: user.uid,
        optionIdx,
        createdAt: serverTimestamp(),
      });
      toast({ message: "Vote submitted", type: "success" });
    } catch {
      setVotedPolls((p) => ({ ...p, [poll.id]: false }));
      toast({ message: "Could not submit vote", type: "error" });
    }
  }

  function resolveAttention(requestId) {
    updateDoc(doc(db, "attentionRequests", requestId), { resolved: true, resolvedAt: serverTimestamp() })
      .then(() => {
        setAttentionRequests((prev) => prev.filter((r) => r.id !== requestId));
        toast({ message: "Attention request resolved", type: "success" });
      })
      .catch(() => toast({ message: "Could not resolve request", type: "error" }));
  }

  const responses = Object.values(studentResponses || {});
  const understoodCount = responses.filter((r) => r.understood === true).length;
  const confusedCount = responses.filter((r) => r.understood === false).length;
  const activeCount = responses.filter((r) => isRecentlyActive(r.lastActive)).length;

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", padding: "24px clamp(16px, 5vw, 80px)", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <Link to={isTeacher ? "/teacher" : "/dashboard"} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 15, fontWeight: 600 }}>
          <ArrowLeft size={18} /> Exit
        </Link>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}
          style={{ background: "var(--bg-3)", border: "1px solid #333", borderRadius: 10, color: "#fff", padding: "10px 16px", fontSize: 16, fontWeight: 700, outline: "none", fontFamily: "inherit" }}>
          {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>

        <div style={{ display: "flex", gap: 12, marginLeft: "auto", alignItems: "center" }}>
          {isTeacher && (
            <button onClick={() => setShowAttention(!showAttention)}
              style={{ padding: "8px 16px", borderRadius: 8, background: attentionRequests.length > 0 ? "#ef4444" : "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <HelpCircle size={16} /> {attentionRequests.length > 0 ? `${attentionRequests.length} needs help` : "Attention Panel"}
            </button>
          )}

          {!isTeacher && activePolls.length > 0 && (
            <span style={{ padding: "8px 16px", borderRadius: 8, background: "#f59e0b", color: "#000", fontWeight: 700, fontSize: 14, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MessageSquare size={16} /> {activePolls.length} Live Poll{activePolls.length > 1 ? "s" : ""}
            </span>
          )}

          <span style={{ color: "var(--text-muted)", fontSize: 15, fontWeight: 700 }}>
            {questions.length > 0 ? `Question ${idx + 1} / ${questions.length}` : "Loading…"}
          </span>
        </div>
      </div>

      {/* Attention Panel (Teacher) */}
      {isTeacher && showAttention && attentionRequests.length > 0 && (
        <div style={{ position: "fixed", top: 100, right: 24, zIndex: 50, width: 380, maxHeight: "50vh", overflowY: "auto" }}>
          <div className="glass-card p-4 space-y-3" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-text flex items-center gap-2"><HelpCircle size={18} className="text-red-500" /> Students Need Help ({attentionRequests.length})</h3>
              <button onClick={() => setShowAttention(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
            </div>
            {attentionRequests.map((req) => (
              <div key={req.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                      <HelpCircle size={16} className="text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text text-sm truncate">{req.studentName}</p>
                      <p className="text-xs text-text-muted truncate">{req.message}</p>
                    </div>
                  </div>
                  <button onClick={() => resolveAttention(req.id)} className="btn-primary px-3 py-1 text-xs shrink-0">Resolve</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Polls (Student) */}
      {!isTeacher && activePolls.length > 0 && (
        <div style={{ position: "fixed", top: 100, right: 24, zIndex: 50, width: 360, maxHeight: "60vh", overflowY: "auto" }}>
          <div className="glass-card p-4 space-y-4" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-text flex items-center gap-2"><MessageSquare size={18} className="text-amber-500" /> Live Polls</h3>
            </div>
            {activePolls.map((poll) => (
              <div key={poll.id} className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-3">
                <p className="font-semibold text-text text-sm">{poll.question}</p>
                <div className="space-y-2">
                  {(poll.options || []).map((opt, i) => (
                    <button key={i} onClick={() => votePoll(poll, i)}
                      disabled={!!votedPolls[poll.id]}
                      style={{ width: "100%", textAlign: "left", padding: "12px", borderRadius: 10, background: "var(--bg-3)", border: "1px solid var(--border)", color: "#fff", fontSize: 14, cursor: votedPolls[poll.id] ? "default" : "pointer", opacity: votedPolls[poll.id] ? 0.6 : 1 }}>
                      {opt}
                    </button>
                  ))}
                </div>
                {votedPolls[poll.id] && <p className="text-xs text-green-400 text-center">✓ Vote recorded</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Student Attention Component */}
      {!isTeacher && profile !== undefined && (
        <StudentAttention classId={classKey} enabled />
      )}

      {/* Main Question Area */}
      {!q ? (
        <p style={{ color: "var(--text-muted)", fontSize: 18, textAlign: "center", marginTop: 60 }}>No questions for this subject yet.</p>
      ) : (
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 800, lineHeight: 1.5, marginBottom: 8 }}>
                {q.question}
              </div>
              <div style={{ color: "var(--primary)", fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{q.topic} · {q.exam} {q.year}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Question {idx + 1} of {questions.length}</div>
            </div>

            {!isTeacher && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => toggleUnderstood(true)}
                  style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(34,197,94,0.2)", border: "2px solid #22c55e", color: "#22c55e", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ThumbsUp size={16} /> I get it
                </button>
                <button onClick={() => toggleUnderstood(false)}
                  style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(239,68,68,0.2)", border: "2px solid #ef4444", color: "#ef4444", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <ThumbsDown size={16} /> Confused
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {Object.entries(q.options || {}).map(([letter, text]) => {
              const isAnswer = letter === (q.correctAnswer || q.answer);
              const isPicked = picked === letter;
              let bg = "#141419";
              let border = "2px solid var(--border)";
              if (revealed && isAnswer) { bg = "rgba(34,197,94,0.18)"; border = "2px solid #22c55e"; }
              else if (revealed && isPicked && !isAnswer) { bg = "rgba(239,68,68,0.15)"; border = "2px solid #ef4444"; }
              else if (isPicked) { bg = "rgb(var(--primary-rgb) / 0.2)"; border = "2px solid var(--primary)"; }
              return (
                <button key={letter} onClick={() => choose(letter)}
                  style={{
                    display: "flex", alignItems: "center", gap: 18, textAlign: "left",
                    background: bg, border, borderRadius: 16, padding: "20px 24px",
                    color: "#fff", cursor: "pointer", fontFamily: "inherit",
                    fontSize: "clamp(17px, 2.4vw, 24px)", fontWeight: 600, lineHeight: 1.5,
                    transition: "all 0.2s ease",
                  }}>
                  <span style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: revealed && isAnswer ? "#22c55e" : "var(--primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 24,
                  }}>{letter}</span>
                  {text}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div style={{ marginTop: 24, padding: 24, borderRadius: 16, background: "rgb(var(--primary-rgb) / 0.12)", borderLeft: "4px solid var(--primary)", fontSize: "clamp(15px, 2vw, 19px)", lineHeight: 1.7 }}>
              <strong>Explanation: </strong>{q.explanation || "Review this topic in your textbook."}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <button onClick={() => setRevealed((r) => !r)}
              style={{ padding: "14px 28px", borderRadius: 12, background: "transparent", border: "2px solid var(--primary)", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
              {revealed ? <><EyeOff size={18} /> Hide answer</> : <><Eye size={18} /> Reveal answer</>}
            </button>
            <button onClick={next}
              style={{ padding: "14px 28px", borderRadius: 12, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "inherit" }}>
              Next question <ArrowRight size={18} />
            </button>
          </div>

          {isTeacher && (
            <div style={{ marginTop: 32, padding: 20, borderRadius: 16, background: "var(--bg-3)", border: "1px solid var(--border)" }}>
              <h4 className="font-bold text-text mb-4 flex items-center gap-2"><Users size={18} className="text-primary" /> Live Class Engagement</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                <div className="text-center p-4 bg-primary/10 rounded-xl">
                  <div className="text-3xl font-black text-primary">{understoodCount}</div>
                  <div className="text-sm text-text-muted">Understood</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-xl">
                  <div className="text-3xl font-black text-red-500">{confusedCount}</div>
                  <div className="text-sm text-text-muted">Confused</div>
                </div>
                <div className="text-center p-4 bg-amber-500/10 rounded-xl">
                  <div className="text-3xl font-black text-amber-500">{attentionRequests.length}</div>
                  <div className="text-sm text-text-muted">Need Help</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-xl">
                  <div className="text-3xl font-black text-green-500">{activeCount}</div>
                  <div className="text-sm text-text-muted">Active Now</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

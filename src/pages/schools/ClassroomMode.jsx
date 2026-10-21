// Classroom mode — one shared live session per class.
//
// The teacher's question set, current index and reveal state live in
// classSessions/{classId}, so every student sees the exact same question (the
// old build generated a different random set per device). Answers are stored
// in a teacher-only `key` subcollection and only copied into the public session
// when the teacher reveals them.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getUserProfile } from "../../lib/userProfile";
import { getQuestionsFromBank } from "../../data/questions/compat";
import { JAMB_SUBJECTS } from "../../data/subjects";
import { getClass, listSchoolTeachers } from "../../lib/schools";
import {
  subscribeClassSession, startClassSession, updateClassSession, revealClassAnswer,
  subscribeClassSubmissions, subscribeClassChat, sendClassChatMessage,
  subscribeSubmissionReactions, subscribeSubmissionComments, reactToSubmission,
  addSubmissionComment, saveTeacherRemark, notifyUser,
} from "../../lib/classroom";
import { useToast } from "../../components/Toast";
import AttemptWorkspace from "../../components/AttemptWorkspace";
import NotepadDrawer from "../../components/NotepadDrawer";
import StudentAttention from "../../components/StudentAttention";
import TeacherTools from "../../components/TeacherTools";
import {
  ArrowLeft, ArrowRight, Eye, EyeOff, Users, HelpCircle, MessageSquare,
  ThumbsUp, ThumbsDown, Heart, Play, Square, NotebookPen, Image as ImageIcon,
  Send, Loader2, Sparkles, X,
} from "lucide-react";

export default function ClassroomMode() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const [profile, setProfile] = useState(undefined);
  const [cls, setCls] = useState(null);
  const [session, setSession] = useState(null);
  const [subject, setSubject] = useState("Physics");
  const [starting, setStarting] = useState(false);
  const [picked, setPicked] = useState(null);
  const [showAttention, setShowAttention] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [notepad, setNotepad] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useState([]);
  const [chatText, setChatText] = useState("");
  const [discussion, setDiscussion] = useState(false);

  useEffect(() => {
    if (!user) return;
    let live = true;
    getUserProfile(user.uid)
      .then((p) => { if (live) setProfile(p || null); })
      .catch(() => { if (live) setProfile(null); });
    return () => { live = false; };
  }, [user]);

  const isTeacher = profile?.role === "teacher";

  const classId = useMemo(() => {
    try {
      const fromQuery = new URLSearchParams(location.search).get("class");
      if (fromQuery?.trim()) return fromQuery.trim().slice(0, 80);
    } catch { /* ignore */ }
    return profile?.classIds?.[0] || null;
  }, [location.search, profile?.classIds]);

  useEffect(() => {
    if (!classId) { setCls(null); return; }
    getClass(classId).then(setCls).catch(() => setCls(null));
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    return subscribeClassSession(classId, (s) => {
      setSession(s);
      if (s?.subject) setSubject(s.subject);
    });
  }, [classId]);

  useEffect(() => {
    if (!classId) { setSubmissions([]); return; }
    return subscribeClassSubmissions(classId, setSubmissions);
  }, [classId]);

  useEffect(() => {
    if (!isTeacher || !profile?.schoolId) { setTeachers([]); return; }
    listSchoolTeachers(profile.schoolId).then(setTeachers).catch(() => setTeachers([]));
  }, [isTeacher, profile?.schoolId]);

  useEffect(() => {
    if (!chatOpen || !classId) { setChat([]); return; }
    return subscribeClassChat(classId, setChat);
  }, [chatOpen, classId]);

  useEffect(() => { setPicked(null); }, [session?.currentIdx, session?.revealed]);

  async function start() {
    if (!classId || !user) return;
    setStarting(true);
    try {
      const questions = getQuestionsFromBank({ subject, count: 30 });
      if (!questions?.length) throw new Error("No questions for that subject yet.");
      await startClassSession({
        classId,
        teacherUid: user.uid,
        teacherName: profile?.name || user.displayName || "Teacher",
        subject,
        questions,
      });
      toast({ message: "Live session started ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not start the session", type: "error" });
    } finally {
      setStarting(false);
    }
  }

  async function next() {
    if (!session) return;
    const nextIdx = (Number(session.currentIdx || 0) + 1) % Math.max(session.questions?.length || 1, 1);
    await updateClassSession(classId, { currentIdx: nextIdx, revealed: false, revealedAnswer: null, revealedExplanation: "" });
  }

  async function reveal() {
    if (!session) return;
    const q = session.questions?.[session.currentIdx];
    if (!q) return;
    try {
      if (session.revealed) await updateClassSession(classId, { revealed: false, revealedAnswer: null, revealedExplanation: "" });
      else await revealClassAnswer(classId, q.id);
    } catch (e) {
      toast({ message: e.message || "Could not reveal the answer", type: "error" });
    }
  }

  async function endSession() {
    if (!session) return;
    if (!window.confirm("End the live session for everyone?")) return;
    await updateClassSession(classId, { active: false });
  }

  async function sendChat() {
    const text = chatText.trim();
    if (!text || !classId || !user) return;
    setChatText("");
    try {
      await sendClassChatMessage(classId, {
        fromUid: user.uid,
        fromName: profile?.name || user.displayName || "User",
        text,
      });
    } catch (e) {
      toast({ message: e.message || "Message failed", type: "error" });
    }
  }

  async function discussCurrent() {
    const q = session?.questions?.[session.currentIdx];
    if (!q) return;
    setDiscussion(true);
  }

  const q = session?.questions?.[session?.currentIdx];
  const revealed = Boolean(session?.revealed);
  const answer = session?.revealedAnswer || null;

  if (profile === undefined) {
    return <div className="page-content text-text-muted">Loading classroom…</div>;
  }

  if (!classId) {
    return (
      <div className="page-content max-w-xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-black text-text">Classroom mode</h1>
        <p className="text-text-muted">Open this from your class or join a class with a code first.</p>
        <Link to={isTeacher ? "/teacher" : "/join"} className="btn-primary inline-flex px-6">{isTeacher ? "Teacher dashboard" : "Join a class"}</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", padding: "18px clamp(12px, 4vw, 56px) 90px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <Link to={isTeacher ? "/teacher" : "/dashboard"} className="inline-flex items-center gap-1.5 text-text-muted text-sm font-semibold">
          <ArrowLeft size={17} /> Exit
        </Link>
        <div className="min-w-0">
          <div className="text-sm font-black text-text truncate">{cls?.name || "Class"} <span className="text-text-muted font-medium">· {cls?.subject || subject}</span></div>
          <div className="text-[11px] text-text-muted">Live classroom · {isTeacher ? "teacher controls" : "following your teacher"}</div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setNotepad(true)} className="btn-secondary text-xs px-3 py-1.5"><NotebookPen size={14} /> Notepad</button>
          <button onClick={() => setChatOpen(true)} className="btn-secondary text-xs px-3 py-1.5"><MessageSquare size={14} /> Class chat</button>
          {isTeacher && (
            <button onClick={() => setShowAttention((v) => !v)} className="btn-secondary text-xs px-3 py-1.5">
              <HelpCircle size={14} /> Help
            </button>
          )}
          <span className="text-xs font-bold text-text-muted">
            {session?.questions?.length ? `${Number(session.currentIdx || 0) + 1} / ${session.questions.length}` : "No session"}
          </span>
        </div>
      </div>

      {!session && (
        <div className="max-w-2xl mx-auto glass-card p-6 text-center space-y-4 mt-8">
          <Users size={38} className="mx-auto text-primary" />
          <h1 className="text-xl font-black text-text">{isTeacher ? "Start a live session" : "Waiting for your teacher"}</h1>
          <p className="text-sm text-text-muted">
            {isTeacher
              ? "Pick a subject, then every student in this class sees the same question and your reveal controls."
              : "Your teacher hasn't started yet. Keep this page open — it updates automatically."}
          </p>
          {isTeacher && (
            <>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field max-w-xs mx-auto">
                {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button onClick={start} disabled={starting} className="btn-primary px-6">
                {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start session
              </button>
            </>
          )}
        </div>
      )}

      {session && !session.active && (
        <div className="max-w-2xl mx-auto glass-card p-4 mb-4 text-sm text-text-muted">
          This session has ended. {isTeacher ? "Start a new one when you're ready." : "Ask your teacher to start a new session."}
        </div>
      )}

      {session && q && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="rounded-3xl border border-border p-5 sm:p-7" style={{ background: "var(--bg-2)" }}>
            <div className="flex items-start gap-3 flex-wrap mb-4">
              <div className="flex-1 min-w-[240px]">
                <p className="text-lg sm:text-2xl font-bold leading-relaxed text-text">{q.question}</p>
                <p className="text-xs text-primary font-bold mt-2">{q.topic} · {Array.isArray(q.exam) ? q.exam.join(", ") : q.exam} {q.year || ""}</p>
              </div>
              <button onClick={() => setAttempt(q)} className="btn-primary text-sm px-4 py-2"><Sparkles size={15} /> Attempt on whiteboard</button>
            </div>

            <div className="grid gap-2.5">
              {Object.entries(q.options || {}).map(([letter, text]) => {
                const isAnswer = revealed && letter === answer;
                const isPicked = picked === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => setPicked(letter)}
                    className="flex items-center gap-3 text-left rounded-2xl px-4 py-3.5 border transition-all"
                    style={{
                      borderColor: isAnswer ? "#22c55e" : isPicked ? "var(--primary)" : "var(--border)",
                      background: isAnswer ? "rgba(34,197,94,.14)" : isPicked ? "rgb(var(--primary-rgb) / .14)" : "var(--bg-3)",
                      color: "var(--text)",
                    }}
                  >
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0" style={{ background: isAnswer ? "#22c55e" : "var(--primary)", color: "#04120c" }}>{letter}</span>
                    <span className="text-sm sm:text-base font-semibold">{text}</span>
                  </button>
                );
              })}
            </div>

            {revealed && (
              <div className="mt-4 rounded-2xl border-l-4 border-primary bg-primary/10 p-4 text-sm leading-relaxed text-text">
                <strong>Answer: {answer}. </strong>{session.revealedExplanation || q.explanation || "Review this topic in your textbook."}
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-5">
              {isTeacher ? (
                <>
                  <button onClick={reveal} className="btn-secondary text-sm"><Eye size={15} /> {revealed ? "Hide answer" : "Reveal answer"}</button>
                  <button onClick={next} className="btn-primary text-sm">Next question <ArrowRight size={15} /></button>
                  <button onClick={endSession} className="btn-secondary text-sm text-red-400"><Square size={14} /> End</button>
                </>
              ) : (
                <>
                  <button onClick={() => setPicked(null)} className="btn-secondary text-sm">Clear pick</button>
                  <button onClick={() => setDiscussion(true)} className="btn-secondary text-sm"><MessageSquare size={15} /> Discuss</button>
                </>
              )}
            </div>
          </div>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-black text-text">Class working</h2>
              <span className="text-xs text-text-muted">{submissions.length} submission{submissions.length === 1 ? "" : "s"}</span>
            </div>
            {submissions.length === 0 ? (
              <p className="text-sm text-text-muted">No one has submitted work yet. Use “Attempt on whiteboard”.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {submissions.map((s) => (
                  <SubmissionCard
                    key={s.id}
                    submission={s}
                    isTeacher={isTeacher}
                    currentUser={user}
                    profile={profile}
                    onOpen={() => setPreview(s)}
                  />
                ))}
              </div>
            )}
          </section>

          {isTeacher && (
            <TeacherTools schoolId={profile?.schoolId} roster={[]} classId={classId} />
          )}
          {!isTeacher && profile !== undefined && <StudentAttention classId={classId} enabled />}
        </div>
      )}

      {isTeacher && showAttention && (
        <div className="fixed top-20 right-4 z-40">
          <div className="glass-card p-3 text-xs text-text-muted">Student help signals appear here and in the teacher dashboard.</div>
        </div>
      )}

      <AttemptWorkspace
        open={Boolean(attempt)}
        onClose={() => setAttempt(null)}
        question={attempt}
        classId={classId}
        sessionId={session?.id || "live"}
        teacherUid={cls?.teacherId || session?.teacherUid}
        teacherName={cls?.teacherName || session?.teacherName}
        teachers={teachers}
        studentName={profile?.name || user?.displayName || "Student"}
        onSubmit={() => setAttempt(null)}
      />

      <AttemptWorkspace
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        question={session?.questions?.find((x) => String(x.id) === String(preview?.questionId))}
        classId={classId}
        sessionId={preview?.sessionId}
        initialStrokes={preview?.strokes || []}
        readOnly
        remarks={preview?.teacherRemarks || ""}
      />

      <NotepadDrawer open={notepad} onClose={() => setNotepad(false)} context={q?.question || ""} />

      {chatOpen && (
        <div className="fixed inset-0 z-[75]">
          <button className="absolute inset-0 bg-black/40" onClick={() => setChatOpen(false)} aria-label="Close chat" />
          <aside className="absolute right-0 top-0 h-full w-full sm:w-[390px] flex flex-col border-l border-border" style={{ background: "var(--bg-2)" }}>
            <header className="flex items-center justify-between p-3 border-b border-border">
              <span className="font-black text-text flex items-center gap-2"><MessageSquare size={16} className="text-primary" /> Class chat</span>
              <button onClick={() => setChatOpen(false)} className="p-1.5 text-text-muted"><X size={18} /></button>
            </header>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.length === 0 && <p className="text-sm text-text-muted">Ask a question or help a classmate. Be kind.</p>}
              {chat.map((m) => (
                <div key={m.id} className={`rounded-2xl p-2.5 text-sm ${m.fromUid === user?.uid ? "bg-primary/10 ml-8" : "bg-bg-3 mr-8"}`}>
                  <div className="text-[10px] font-bold text-text-muted mb-0.5">{m.fromName || "User"}</div>
                  <div className="text-text whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Message the class…" className="input-field text-sm" />
              <button onClick={sendChat} className="btn-primary px-3"><Send size={15} /></button>
            </div>
          </aside>
        </div>
      )}

      {discussion && (
        <div className="fixed inset-0 z-[76] flex items-center justify-center p-4">
          <button className="absolute inset-0 bg-black/50" onClick={() => setDiscussion(false)} aria-label="Close discussion" />
          <div className="relative glass-card w-full max-w-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-text">Discuss this question</h3>
              <button onClick={() => setDiscussion(false)} className="text-text-muted"><X size={18} /></button>
            </div>
            <p className="text-sm text-text-muted">{q?.question}</p>
            <div className="text-sm text-text">Use class chat to compare approaches. Your teacher can reveal the official answer when ready.</div>
            <button onClick={() => { setDiscussion(false); setChatOpen(true); }} className="btn-primary w-full"><MessageSquare size={15} /> Open class chat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionCard({ submission, isTeacher, currentUser, profile, onOpen }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [remark, setRemark] = useState(submission.teacherRemarks || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const a = subscribeSubmissionReactions(submission.id, setReactions);
    const b = subscribeSubmissionComments(submission.id, setComments);
    return () => { a?.(); b?.(); };
  }, [expanded, submission.id]);

  const counts = useMemo(() => {
    const c = { heart: 0, better: 0, down: 0 };
    reactions.forEach((r) => { if (c[r.type] != null) c[r.type] += 1; });
    return c;
  }, [reactions]);

  async function react(type) {
    if (!currentUser) return;
    try {
      await reactToSubmission({ submissionId: submission.id, classId: submission.classId, uid: currentUser.uid, type });
      if (submission.studentUid !== currentUser.uid) {
        await notifyUser(submission.studentUid, {
          type: "reaction",
          title: `${profile?.name || currentUser.displayName || "Someone"} reacted to your work`,
          body: type === "heart" ? "❤️ Nice work" : type === "better" ? "You can do better" : "Needs another look",
          link: "/classroom",
          actorName: profile?.name || currentUser.displayName,
        });
      }
    } catch (e) {
      toast({ message: e.message || "Reaction failed", type: "error" });
    }
  }

  async function addComment() {
    const text = comment.trim();
    if (!text || !currentUser) return;
    setComment("");
    try {
      await addSubmissionComment({
        submissionId: submission.id, classId: submission.classId,
        uid: currentUser.uid, name: profile?.name || currentUser.displayName || "Student", text,
      });
      if (submission.studentUid !== currentUser.uid) {
        await notifyUser(submission.studentUid, {
          type: "comment", title: "New comment on your work", body: text.slice(0, 120),
          link: "/classroom", actorName: profile?.name || currentUser.displayName,
        });
      }
    } catch (e) {
      toast({ message: e.message || "Comment failed", type: "error" });
    }
  }

  async function saveRemark() {
    if (!remark.trim()) return;
    setSaving(true);
    try {
      await saveTeacherRemark(submission.id, {
        teacherUid: currentUser.uid,
        teacherName: profile?.name || currentUser.displayName || "Teacher",
        remark,
      });
      await notifyUser(submission.studentUid, {
        type: "review_remark", title: "Your teacher left a remark",
        body: remark.slice(0, 120), link: "/classroom",
        actorName: profile?.name || currentUser.displayName,
      });
      toast({ message: "Remark saved ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not save remark", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border p-3" style={{ background: "var(--bg-2)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-black">
          {(submission.studentName || "S").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text truncate">{submission.studentName || "Student"}</p>
          <p className="text-[10px] text-text-muted">{submission.status === "reviewed" ? "Reviewed" : submission.status === "submitted" ? "Submitted" : "Draft"}</p>
        </div>
        <button onClick={onOpen} className="btn-secondary text-xs px-2.5 py-1.5"><ImageIcon size={13} /> View</button>
      </div>

      {submission.thumbnail ? (
        <button onClick={onOpen} className="mt-2 block w-full rounded-xl overflow-hidden border border-border">
          <img src={submission.thumbnail} alt={`${submission.studentName}'s working`} className="w-full h-auto" loading="lazy" />
        </button>
      ) : null}

      <div className="flex items-center gap-1.5 mt-2">
        <button onClick={() => react("heart")} className="px-2 py-1 rounded-lg bg-bg-3 text-xs text-text"><Heart size={13} /> {counts.heart || ""}</button>
        <button onClick={() => react("better")} className="px-2 py-1 rounded-lg bg-bg-3 text-xs text-text"><ThumbsUp size={13} /> {counts.better || ""}</button>
        <button onClick={() => react("down")} className="px-2 py-1 rounded-lg bg-bg-3 text-xs text-text"><ThumbsDown size={13} /> {counts.down || ""}</button>
        <button onClick={() => setExpanded((v) => !v)} className="ml-auto text-xs text-primary font-bold">{expanded ? "Hide" : "Comments"}</button>
      </div>

      {expanded && (
        <div className="mt-2 space-y-2">
          {submission.teacherRemarks && <p className="text-xs rounded-lg bg-accent/10 border border-accent/20 p-2 text-text"><strong>Remark:</strong> {submission.teacherRemarks}</p>}
          {isTeacher && (
            <div className="flex gap-1.5">
              <input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark…" className="input-field text-xs py-1.5" />
              <button onClick={saveRemark} disabled={saving} className="btn-primary text-xs px-2.5">{saving ? "…" : "Save"}</button>
            </div>
          )}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="text-xs text-text"><strong className="text-text-muted">{c.name}:</strong> {c.text}</div>
            ))}
            {comments.length === 0 && <p className="text-xs text-text-muted">No comments yet.</p>}
          </div>
          <div className="flex gap-1.5">
            <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addComment(); }} placeholder="Comment…" className="input-field text-xs py-1.5" />
            <button onClick={addComment} className="btn-secondary text-xs px-2.5"><Send size={12} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

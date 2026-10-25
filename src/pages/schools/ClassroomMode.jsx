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
import { getClass, listSchoolTeachers, listClassStudents } from "../../lib/schools";
import {
  subscribeClassSession, startClassSession, updateClassSession, revealClassAnswer,
  subscribeClassSubmissions, subscribeClassChat, sendClassChatMessage,
  subscribeSubmissionReactions, subscribeSubmissionComments, reactToSubmission,
  addSubmissionComment, saveTeacherRemark, notifyUser,
  subscribeClassPolls, voteClassPoll, subscribeClassAnnouncements,
  setClassPulse, subscribeClassPulse,
  ensureDiscussion, subscribeDiscussionMessages, sendDiscussionMessage,
} from "../../lib/classroom";
import { isOnline, subscribePresenceForUids } from "../../lib/presence";
import { useToast } from "../../components/Toast";
import PresenceBadge from "../../components/PresenceBadge";
import AttemptWorkspace from "../../components/AttemptWorkspace";
import NotepadDrawer from "../../components/NotepadDrawer";
import StudentAttention from "../../components/StudentAttention";
import TeacherTools from "../../components/TeacherTools";
import {
  ArrowLeft, ArrowRight, Eye, Users, HelpCircle, MessageSquare,
  ThumbsUp, ThumbsDown, Heart, Play, Square, NotebookPen, Image as ImageIcon,
  Send, Loader2, Sparkles, X, Clock, Megaphone, CheckCircle2, AlertCircle,
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
  const [discussionId, setDiscussionId] = useState("");
  const [discussionMessages, setDiscussionMessages] = useState([]);
  const [discussionText, setDiscussionText] = useState("");
  const [roster, setRoster] = useState([]);
  const [presence, setPresence] = useState({});
  const [polls, setPolls] = useState([]);
  const [pollVotes, setPollVotes] = useState({});
  const [announcements, setAnnouncements] = useState([]);
  const [pulse, setPulse] = useState("working");
  const [pulseRows, setPulseRows] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [questionSeconds, setQuestionSeconds] = useState(0);
  const [mode, setMode] = useState("guided");
  const [allowChat, setAllowChat] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [now, setNow] = useState(0);

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
    if (!classId) return;
    getClass(classId).then(setCls).catch(() => setCls(null));
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    return subscribeClassSession(classId, (s) => {
      setSession(s);
      if (s?.subject) setSubject(s.subject);
      if (s?.allowChat != null) setAllowChat(Boolean(s.allowChat));
      if (s?.showLeaderboard != null) setShowLeaderboard(Boolean(s.showLeaderboard));
    });
  }, [classId]);

  useEffect(() => {
    if (!classId) return;
    listClassStudents(classId).then(setRoster).catch(() => setRoster([]));
  }, [classId]);

  useEffect(() => {
    const cfg = cls?.config;
    if (!cfg) return;
    setQuestionSeconds(Number(cfg.questionSeconds) || 0);
    setAllowChat(cfg.allowChat !== false);
    setShowLeaderboard(cfg.showLeaderboard !== false);
    setInstructions(cfg.instructions || "");
  }, [cls?.id]);

  const presenceIds = useMemo(() => {
    const ids = new Set([user?.uid, cls?.teacherId, session?.teacherUid]);
    roster.forEach((r) => ids.add(r.uid));
    return [...ids].filter(Boolean).slice(0, 60);
  }, [user?.uid, cls?.teacherId, session?.teacherUid, roster]);

  useEffect(
    () => subscribePresenceForUids(presenceIds, setPresence),
    [presenceIds.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const a = subscribeClassPolls(classId, setPolls);
    const b = subscribeClassAnnouncements(classId, setAnnouncements);
    const c = subscribeClassPulse(classId, setPulseRows);
    return () => { a?.(); b?.(); c?.(); };
  }, [classId]);

  useEffect(() => {
    if (!user || !classId) return;
    const push = () => setClassPulse(classId, {
      studentUid: user.uid,
      studentName: profile?.name || user.displayName || "Student",
      state: pulse,
    }).catch(() => {});
    push();
    const timer = setInterval(push, 45_000);
    return () => clearInterval(timer);
  }, [classId, user?.uid, profile?.name, pulse]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!discussion) return undefined;
    return subscribeDiscussionMessages(discussionId, setDiscussionMessages);
  }, [discussion, discussionId]);

  useEffect(() => {
    if (!classId) return undefined;
    return subscribeClassSubmissions(classId, setSubmissions);
  }, [classId]);

  useEffect(() => {
    if (!isTeacher) return;
    listSchoolTeachers(profile?.schoolId).then(setTeachers).catch(() => setTeachers([]));
  }, [isTeacher, profile?.schoolId]);

  useEffect(() => {
    if (!chatOpen) return undefined;
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
        instructions,
        questionSeconds,
        mode,
        allowChat,
        showLeaderboard,
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
    const total = Math.max(session.questions?.length || 1, 1);
    const nextIdx = Math.min(total - 1, Number(session.currentIdx || 0) + 1);
    await updateClassSession(classId, {
      currentIdx: nextIdx,
      revealed: false,
      revealedAnswer: null,
      revealedExplanation: "",
      questionStartedAt: new Date(),
      questionEndsAt: session.questionSeconds > 0
        ? new Date(Date.now() + Number(session.questionSeconds) * 1000)
        : null,
    });
  }

  async function applyQuestionTimer(seconds) {
    if (!session || !isTeacher) return;
    const value = Math.max(0, Math.min(900, Number(seconds) || 0));
    await updateClassSession(classId, {
      questionSeconds: value,
      questionStartedAt: new Date(),
      questionEndsAt: value > 0 ? new Date(Date.now() + value * 1000) : null,
    });
  }

  async function vote(poll, optionIdx) {
    if (!user || pollVotes[poll.id] != null) return;
    try {
      await voteClassPoll({ pollId: poll.id, classId, studentUid: user.uid, optionIdx });
      setPollVotes((v) => ({ ...v, [poll.id]: optionIdx }));
      toast({ message: "Vote recorded", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not save vote", type: "error" });
    }
  }

  async function openDiscussion() {
    if (!q || !user || !classId) return;
    try {
      const id = await ensureDiscussion({
        classId,
        questionId: q.id,
        createdBy: user.uid,
        title: String(q.question || "Question discussion").slice(0, 120),
      });
      setDiscussionId(id);
      setDiscussion(true);
    } catch (e) {
      toast({ message: e.message || "Could not open discussion", type: "error" });
    }
  }

  async function sendDiscussion() {
    const text = discussionText.trim();
    if (!text || !discussionId || !user) return;
    setDiscussionText("");
    try {
      await sendDiscussionMessage(discussionId, {
        fromUid: user.uid,
        fromName: profile?.name || user.displayName || "Student",
        text,
      });
    } catch (e) {
      toast({ message: e.message || "Message failed", type: "error" });
    }
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
    if (!allowChat && !isTeacher) {
      toast({ message: "Chat is paused by your teacher.", type: "info" });
      return;
    }
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

  const q = session?.questions?.[session?.currentIdx];
  const revealed = Boolean(session?.revealed);
  const answer = session?.revealedAnswer || null;
  const questionEndMs = session?.questionEndsAt?.toMillis?.()
    || (session?.questionEndsAt?.seconds ? session.questionEndsAt.seconds * 1000 : 0);
  const questionRemaining = questionEndMs > 0 ? Math.max(0, questionEndMs - now) : 0;
  const onlineCount = Object.values(presence).filter(isOnline).length;
  const teacherOnline = isOnline(presence[session?.teacherUid || cls?.teacherId]);
  const pulseCounts = pulseRows.reduce((acc, row) => {
    const key = row.state || "working";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

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
          <div className="text-[11px] text-text-muted flex items-center gap-2 flex-wrap">
            <span>Live classroom · {isTeacher ? "teacher controls" : "following your teacher"}</span>
            <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{onlineCount} online</span>
            {isTeacher && <PresenceBadge presence={presence[user?.uid]} />}
            {!isTeacher && <span className="inline-flex items-center gap-1"><PresenceBadge presence={presence[session?.teacherUid || cls?.teacherId]} /> Teacher</span>}
          </div>
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
          <div className="flex items-center justify-center gap-2 text-xs text-text-muted flex-wrap">
            <span className="inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${teacherOnline ? "bg-emerald-400" : "bg-zinc-500"}`} />Teacher {teacherOnline ? "online" : "offline"}</span>
            <span>· {onlineCount} in room</span>
          </div>
          {isTeacher && (
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="text-xs font-bold text-text-muted">
                  Subject
                  <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field mt-1">
                    {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-text-muted">
                  Mode
                  <select value={mode} onChange={(e) => setMode(e.target.value)} className="input-field mt-1">
                    <option value="guided">Guided practice</option>
                    <option value="timed">Timed quiz</option>
                    <option value="discussion">Discussion first</option>
                  </select>
                </label>
                <label className="text-xs font-bold text-text-muted">
                  Seconds per question
                  <input type="number" min="0" max="900" value={questionSeconds} onChange={(e) => setQuestionSeconds(Number(e.target.value) || 0)} className="input-field mt-1" />
                </label>
                <div className="flex flex-col gap-2 justify-end">
                  <label className="flex items-center gap-2 text-xs font-bold text-text-muted"><input type="checkbox" checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} /> Allow class chat</label>
                  <label className="flex items-center gap-2 text-xs font-bold text-text-muted"><input type="checkbox" checked={showLeaderboard} onChange={(e) => setShowLeaderboard(e.target.checked)} /> Show leaderboard</label>
                </div>
              </div>
              <label className="block text-xs font-bold text-text-muted">
                Instructions for students
                <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3} maxLength={600} placeholder="Today we will focus on…" className="input-field mt-1 resize-none" />
              </label>
              <button onClick={start} disabled={starting} className="btn-primary px-6 w-full">
                {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Start session
              </button>
            </div>
          )}
        </div>
      )}

      {session && !session.active && (
        <div className="max-w-2xl mx-auto glass-card p-4 mb-4 text-sm text-text-muted">
          This session has ended. {isTeacher ? "Start a new one when you're ready." : "Ask your teacher to start a new session."}
        </div>
      )}

      {session?.instructions && (
        <div className="max-w-5xl mx-auto mb-4 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-text flex gap-2">
          <Megaphone size={17} className="text-primary shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{session.instructions}</span>
        </div>
      )}

      {session && roster.length > 0 && (
        <ClassPresenceStrip members={roster} presence={presence} currentUid={user?.uid} />
      )}

      {session?.showLeaderboard !== false && roster.length > 1 && (
        <ClassLeaderStrip members={roster} currentUid={user?.uid} />
      )}

      {announcements.length > 0 && <ClassAnnouncements items={announcements} />}

      {polls.length > 0 && (
        <ClassPolls polls={polls} votes={pollVotes} onVote={vote} isTeacher={isTeacher} />
      )}

      {session && (
        <ClassPulseBar
          isTeacher={isTeacher}
          pulse={pulse}
          onPulse={setPulse}
          counts={pulseCounts}
          rows={pulseRows}
        />
      )}

      {session && q && (
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="rounded-3xl border border-border p-5 sm:p-7" style={{ background: "var(--bg-2)" }}>
            <div className="flex items-start gap-3 flex-wrap mb-4">
              <div className="flex-1 min-w-[240px]">
                <p className="text-lg sm:text-2xl font-bold leading-relaxed text-text">{q.question}</p>
                <p className="text-xs text-primary font-bold mt-2">{q.topic} · {Array.isArray(q.exam) ? q.exam.join(", ") : q.exam} {q.year || ""}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {(session.questionSeconds > 0 || questionEndMs > 0) && (
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-black ${questionRemaining === 0 ? "bg-red-500/15 text-red-400" : "bg-primary/15 text-primary"}`}>
                    <Clock size={15} /> {formatSeconds(Math.ceil(questionRemaining / 1000))}
                  </span>
                )}
                <button onClick={() => setAttempt(q)} className="btn-primary text-sm px-4 py-2"><Sparkles size={15} /> Attempt on whiteboard</button>
              </div>
            </div>
            {isTeacher && (
              <div className="flex items-center gap-1.5 flex-wrap mb-3 text-xs">
                <span className="font-bold text-text-muted">Question timer:</span>
                <button onClick={() => applyQuestionTimer(30)} className="btn-secondary px-2.5 py-1">30s</button>
                <button onClick={() => applyQuestionTimer(60)} className="btn-secondary px-2.5 py-1">1m</button>
                <button onClick={() => applyQuestionTimer(120)} className="btn-secondary px-2.5 py-1">2m</button>
                <button onClick={() => applyQuestionTimer(0)} className="btn-secondary px-2.5 py-1">Off</button>
              </div>
            )}

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
                  <button onClick={openDiscussion} className="btn-secondary text-sm"><MessageSquare size={15} /> Discuss</button>
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
            <TeacherTools schoolId={profile?.schoolId} roster={roster} classId={classId} />
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
              <span className="font-black text-text flex items-center gap-2"><MessageSquare size={16} className="text-primary" /> Class chat <span className="text-[10px] font-semibold text-text-muted">{onlineCount} online</span></span>
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
              {allowChat || isTeacher ? (
                <>
                  <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }} placeholder="Message the class…" className="input-field text-sm" />
                  <button onClick={sendChat} className="btn-primary px-3"><Send size={15} /></button>
                </>
              ) : (
                <p className="text-xs text-text-muted flex items-center gap-1.5"><AlertCircle size={14} /> Chat is paused by your teacher.</p>
              )}
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
            <p className="text-sm text-text-muted line-clamp-3">{q?.question}</p>
            <div className="max-h-[45vh] overflow-y-auto space-y-2 rounded-2xl bg-bg-3 p-2">
              {discussionMessages.length === 0 && (
                <p className="text-xs text-text-muted p-2">Start the discussion — compare methods, not just answers.</p>
              )}
              {discussionMessages.map((m) => (
                <div key={m.id} className={`rounded-xl p-2 text-sm ${m.fromUid === user?.uid ? "bg-primary/10 ml-6" : "bg-bg-2 mr-6"}`}>
                  <div className="text-[10px] font-bold text-text-muted">{m.fromName || "Student"}</div>
                  <div className="text-text whitespace-pre-wrap">{m.text}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={discussionText}
                onChange={(e) => setDiscussionText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendDiscussion(); }}
                placeholder="Share your reasoning…"
                className="input-field text-sm"
              />
              <button onClick={sendDiscussion} className="btn-primary px-3"><Send size={15} /></button>
            </div>
            <button onClick={() => { setDiscussion(false); setChatOpen(true); }} className="btn-secondary w-full text-sm"><MessageSquare size={15} /> Open class chat</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatSeconds(total) {
  const safe = Math.max(0, Number(total) || 0);
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function ClassAnnouncements({ items }) {
  return (
    <div className="max-w-5xl mx-auto mb-4 space-y-2">
      {items.slice(0, 3).map((a) => (
        <div key={a.id} className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-text flex gap-2">
          <Megaphone size={16} className="text-amber-400 shrink-0 mt-0.5" />
          <span className="whitespace-pre-wrap">{a.message}</span>
        </div>
      ))}
    </div>
  );
}

function ClassPresenceStrip({ members, presence, currentUid }) {
  const sorted = [...members].sort((a, b) => Number(isOnline(presence[b.uid])) - Number(isOnline(presence[a.uid])));
  return (
    <div className="max-w-5xl mx-auto mb-3 flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted shrink-0">Who's here</span>
      {sorted.slice(0, 12).map((m) => {
        const online = isOnline(presence[m.uid]);
        return (
          <span key={m.uid} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-2 px-2.5 py-1 text-[11px] font-semibold text-text">
            <span className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400" : "bg-zinc-500"}`} />
            {m.name || "Student"}{m.uid === currentUid ? " (you)" : ""}
          </span>
        );
      })}
      {members.length > 12 && <span className="text-[11px] text-text-muted shrink-0">+{members.length - 12} more</span>}
    </div>
  );
}

function ClassLeaderStrip({ members, currentUid }) {
  const leaders = [...members].sort((a, b) => (b.totalXP || 0) - (a.totalXP || 0)).slice(0, 5);
  return (
    <div className="max-w-5xl mx-auto mb-4 rounded-2xl border border-border bg-bg-2 p-2.5 flex items-center gap-2 overflow-x-auto">
      <span className="text-[10px] font-black uppercase tracking-widest text-accent shrink-0">Class leaders</span>
      {leaders.map((m, i) => (
        <span key={m.uid} className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${m.uid === currentUid ? "bg-primary/15 text-primary" : "text-text-muted"}`}>
          <span className="text-accent">#{i + 1}</span> {m.name || "Student"} <span className="opacity-70">{Number(m.totalXP || 0).toLocaleString()} XP</span>
        </span>
      ))}
    </div>
  );
}

function ClassPolls({ polls, votes, onVote, isTeacher }) {
  return (
    <div className="max-w-5xl mx-auto mb-4 grid gap-3 sm:grid-cols-2">
      {polls.map((poll) => {
        const selected = votes[poll.id];
        return (
          <div key={poll.id} className="rounded-2xl border border-border bg-bg-2 p-3">
            <div className="text-xs font-black text-primary mb-1">LIVE POLL</div>
            <p className="text-sm font-bold text-text mb-2">{poll.question}</p>
            <div className="space-y-1.5">
              {(poll.options || []).map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => onVote(poll, idx)}
                  disabled={selected != null || isTeacher}
                  className="w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors disabled:cursor-default"
                  style={{
                    borderColor: selected === idx ? "var(--primary)" : "var(--border)",
                    background: selected === idx ? "rgb(var(--primary-rgb) / .14)" : "var(--bg-3)",
                    color: "var(--text)",
                  }}
                >
                  <span className="font-black mr-2">{String.fromCharCode(65 + idx)}</span>{opt}
                  {selected === idx && <CheckCircle2 size={14} className="inline ml-2 text-primary" />}
                </button>
              ))}
            </div>
            {selected != null && <p className="text-[11px] text-text-muted mt-2">Vote recorded. Ask your teacher for the class results.</p>}
            {isTeacher && <p className="text-[11px] text-text-muted mt-2">Live tallies are in Teacher tools → Polls.</p>}
          </div>
        );
      })}
    </div>
  );
}

function ClassPulseBar({ isTeacher, pulse, onPulse, counts, rows }) {
  const options = [
    { id: "understood", label: "Got it", icon: CheckCircle2, color: "#22c55e" },
    { id: "working", label: "Working", icon: Clock, color: "#3b82f6" },
    { id: "confused", label: "Confused", icon: HelpCircle, color: "#f59e0b" },
    { id: "away", label: "Away", icon: AlertCircle, color: "#a1a1aa" },
  ];
  return (
    <div className="max-w-5xl mx-auto mb-4 rounded-2xl border border-border bg-bg-2 px-3 py-2.5 flex items-center gap-2 flex-wrap">
      <span className="text-xs font-black text-text-muted mr-auto">How is the class doing?</span>
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = pulse === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onPulse(opt.id)}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold"
            style={{ borderColor: active ? opt.color : "var(--border)", color: active ? opt.color : "var(--text-muted)", background: active ? `${opt.color}18` : "transparent" }}
          >
            <Icon size={13} /> {opt.label}
            <span className="opacity-70">{counts[opt.id] || 0}</span>
          </button>
        );
      })}
      {isTeacher && <span className="text-[10px] text-text-muted w-full">{rows.length} student check-ins this session</span>}
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

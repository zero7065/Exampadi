// src/pages/StudyRoom.jsx — shared study rooms with synced focus timer,
// presence, room chat, host controls and the same question set for everyone.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import PresenceBadge from "../components/PresenceBadge";
import NotepadDrawer from "../components/NotepadDrawer";
import { askGroq } from "../lib/ai";
import { isOnline, subscribePresenceForUids } from "../lib/presence";
import {
  advanceRoomTimer, createRoom, deleteRoomChatMessage, formatRoomClock, joinRoom,
  pauseRoomTimer, resetRoomTimer, roomTimerRemaining, sendRoomChat,
  setRoomPinnedMessage, startRoomTimer, subscribeApprovedRooms, subscribeRoom,
  subscribeRoomChat, submitRoomAnswer, updateRoomSettings,
} from "../lib/rooms";
import { JAMB_SUBJECTS } from "../data/subjects";
import {
  ArrowLeft, Check, Clock, Copy, Globe2, Lock, MessageSquare,
  NotebookPen, Pause, Play, RotateCcw, Send, Settings, SkipForward,
  Sparkles, Target, Trophy, Users, X, Zap,
} from "lucide-react";

const TIMER_DEFAULTS = {
  enabled: true,
  running: false,
  phase: "focus",
  round: 1,
  rounds: 4,
  focusMinutes: 25,
  breakMinutes: 5,
  remainingMs: 25 * 60_000,
  endsAt: null,
};

function Lobby() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("Physics");
  const [exam, setExam] = useState("JAMB");
  const [count, setCount] = useState(10);
  const [visibility, setVisibility] = useState("public");
  const [goal, setGoal] = useState("");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [rounds, setRounds] = useState(4);
  const [allowChat, setAllowChat] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);

  useEffect(() => {
    const unsub = subscribeApprovedRooms(setPublicRooms, 30);
    return () => unsub && unsub();
  }, []);

  async function handleCreate() {
    if (!user) return navigate("/auth");
    setBusy(true);
    try {
      const { code: c } = await createRoom({
        subject, count: Number(count) || 10, exam,
        hostUid: user.uid, hostName: user.name || user.displayName || "Student",
        visibility, goal, focusMinutes, breakMinutes, rounds, allowChat, showLeaderboard,
      });
      toast({ message: `Room ${c} created — share the code with your study crew.`, type: "success" });
      navigate(`/room/${c}`);
    } catch (e) {
      toast({ message: e.message || "Could not create room — check your connection", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin() {
    if (!user) return navigate("/auth");
    if (!code.trim()) { toast({ message: "Enter a room code", type: "warning" }); return; }
    setBusy(true);
    try {
      await joinRoom(code, { uid: user.uid, name: user.name || user.displayName || "Student" });
      navigate(`/room/${code.trim().toUpperCase()}`);
    } catch (e) {
      toast({ message: e.message || "Could not join room", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="glass-card p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Zap size={22} />
          </div>
          <div className="flex-1">
            <h2 className="font-black text-text text-lg">Start a study room</h2>
            <p className="text-sm text-text-muted">Same questions, shared focus timer, live chat, and a leaderboard that moves as you work.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2 mt-4">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field">
            {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
          </select>
          <select value={exam} onChange={(e) => setExam(e.target.value)} className="input-field">
            {["JAMB", "WAEC", "NECO", "NABTEB"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input-field">
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>

        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Today's goal (e.g. Finish 10 motion questions together)"
          className="input-field mt-2"
          maxLength={160}
        />

        <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1"><Clock size={13} /> {focusMinutes}m focus / {breakMinutes}m break</span>
            <span className="inline-flex items-center gap-1">{visibility === "private" ? <Lock size={13} /> : <Globe2 size={13} />} {visibility === "private" ? "Private" : "Public"}</span>
          </div>
          <button onClick={() => setShowSetup((v) => !v)} className="btn-secondary text-xs px-3 py-1.5">
            <Settings size={13} /> {showSetup ? "Hide setup" : "Room setup"}
          </button>
        </div>

        {showSetup && (
          <div className="rounded-2xl border border-border p-4 mt-3 grid sm:grid-cols-2 gap-3" style={{ background: "var(--bg-3)" }}>
            <label className="text-xs font-bold text-text-muted">
              Visibility
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="input-field mt-1">
                <option value="public">Public — discoverable</option>
                <option value="private">Private — code only</option>
              </select>
            </label>
            <label className="text-xs font-bold text-text-muted">
              Focus minutes
              <input type="number" min="1" max="120" value={focusMinutes} onChange={(e) => setFocusMinutes(Number(e.target.value))} className="input-field mt-1" />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Break minutes
              <input type="number" min="1" max="60" value={breakMinutes} onChange={(e) => setBreakMinutes(Number(e.target.value))} className="input-field mt-1" />
            </label>
            <label className="text-xs font-bold text-text-muted">
              Rounds
              <input type="number" min="1" max="12" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="input-field mt-1" />
            </label>
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input type="checkbox" checked={allowChat} onChange={(e) => setAllowChat(e.target.checked)} /> Allow room chat
            </label>
            <label className="flex items-center gap-2 text-sm text-text cursor-pointer">
              <input type="checkbox" checked={showLeaderboard} onChange={(e) => setShowLeaderboard(e.target.checked)} /> Show live leaderboard
            </label>
          </div>
        )}

        <button onClick={handleCreate} disabled={busy} className="btn-primary w-full mt-3 disabled:opacity-60">
          {busy ? "Creating…" : "Create room"}
        </button>
      </section>

      <section className="glass-card p-5">
        <h2 className="font-black text-text mb-1">Join a room</h2>
        <p className="text-sm text-text-muted mb-3">Have a code? Jump straight into the table.</p>
        <div className="flex gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM-XXXXXX"
            className="input-field flex-1 font-mono tracking-widest" maxLength={11} />
          <button onClick={handleJoin} disabled={busy} className="btn-secondary px-5 disabled:opacity-60 whitespace-nowrap">Join</button>
        </div>
      </section>

      {publicRooms.length > 0 && (
        <section className="glass-card p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="font-black text-text">Live public rooms</h2>
              <p className="text-sm text-text-muted">Approved rooms with space to learn together.</p>
            </div>
            <span className="text-xs font-bold text-green-500">{publicRooms.length} open</span>
          </div>
          <div className="space-y-2">
            {publicRooms.map((r) => {
              const timer = r.timer || TIMER_DEFAULTS;
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Users size={16} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold font-mono">{r.code} <span className="font-sans font-medium text-text-muted">· {r.exam} · {r.subject}</span></div>
                    <div className="text-xs text-text-muted truncate">{r.goal || `Host ${r.hostName}`}</div>
                    <div className="text-[11px] text-text-muted mt-0.5">{r.memberCount} member{r.memberCount === 1 ? "" : "s"} · {timer.focusMinutes || 25}/{timer.breakMinutes || 5} focus · {timer.rounds || 4} rounds</div>
                  </div>
                  <button onClick={async () => {
                    if (!user) return navigate("/auth");
                    setBusy(true);
                    try {
                      await joinRoom(r.code, { uid: user.uid, name: user.name || user.displayName || "Student" });
                      navigate(`/room/${r.code}`);
                    } catch (e) {
                      toast({ message: e.message || "Could not join room", type: "error" });
                    } finally {
                      setBusy(false);
                    }
                  }} disabled={busy} className="btn-primary px-4 text-sm disabled:opacity-60">Join</button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function RoomView({ code }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [room, setRoom] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState({});
  const [grading, setGrading] = useState(null);
  const [idx, setIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [presence, setPresence] = useState({});
  const [chat, setChat] = useState([]);
  const [chatText, setChatText] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notepad, setNotepad] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [now, setNow] = useState(0);
  const advancing = useRef(false);

  useEffect(() => {
    if (!user) return;
    joinRoom(code, { uid: user.uid, name: user.name || user.displayName || "Student" }).catch(() => {});
    const unsub = subscribeRoom(code, setRoom);
    const unsubChat = subscribeRoomChat(code, setChat);
    return () => { unsub && unsub(); unsubChat && unsubChat(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user?.uid]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);

  const questions = room?.questions || [];
  const q = questions[idx];
  const members = useMemo(() => Object.entries(room?.progress || {})
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => (b.correct || 0) - (a.correct || 0) || (b.answered || 0) - (a.answered || 0)), [room?.progress]);
  const memberIds = useMemo(() => members.map((m) => m.uid), [members]);

  useEffect(
    () => subscribePresenceForUids(memberIds, setPresence),
    [memberIds.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const timer = room?.timer || TIMER_DEFAULTS;
  const remaining = roomTimerRemaining(timer, now);
  const isHost = Boolean(user && room?.hostUid === user.uid);
  const onlineCount = members.filter((m) => isOnline(presence[m.uid])).length;

  useEffect(() => {
    if (!isHost || !room?.timer?.running || remaining > 0 || advancing.current) return;
    advancing.current = true;
    advanceRoomTimer(code, room.timer)
      .then((phase) => {
        if (phase === "done") toast({ message: "Focus session complete — great work.", type: "success" });
        else toast({ message: phase === "break" ? "Break time. Stretch and breathe." : "Back to focus.", type: "info" });
      })
      .catch(() => {})
      .finally(() => { setTimeout(() => { advancing.current = false; }, 2000); });
  }, [isHost, room?.timer, remaining, code, toast]);

  async function answer(letter) {
    if (!q || answers[q.id] !== undefined || grading) return;
    setAnswers((prev) => ({ ...prev, [q.id]: letter }));
    setGrading(q.id);
    try {
      const verdict = await submitRoomAnswer(code, { questionId: q.id, answer: letter });
      setResults((r) => ({ ...r, [q.id]: verdict }));
    } catch (e) {
      setAnswers((prev) => {
        const copy = { ...prev };
        delete copy[q.id];
        return copy;
      });
      toast({ message: e.message || "Could not grade that answer — try again", type: "error" });
    } finally {
      setGrading(null);
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/room/${code}`;
    try {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({ message: "Room link copied — send it to your study crew", type: "success" });
    } catch {
      toast({ message: link, type: "info" });
    }
  }

  async function sendChat() {
    const text = chatText.trim();
    if (!text || !user) return;
    setChatText("");
    try {
      await sendRoomChat(code, { fromUid: user.uid, fromName: user.name || user.displayName || "Student", text });
    } catch (e) {
      toast({ message: e.message || "Message failed", type: "error" });
    }
  }

  async function explain() {
    if (!q || aiBusy) return;
    setAiBusy(true);
    try {
      const answerText = await askGroq(
        "You are a patient Nigerian secondary-school tutor. Explain this question to a study group in 4 short steps. Give the concept, how to eliminate wrong options, and the correct answer. Do not be verbose.",
        `${q.question}\n\nOptions:\n${Object.entries(q.options || {}).map(([k, v]) => `${k}. ${v}`).join("\n")}`,
        { maxTokens: 450, source: "study-room" },
      );
      setAiText(String(answerText || ""));
    } catch (e) {
      toast({ message: e.message || "AI explanation unavailable", type: "error" });
    } finally {
      setAiBusy(false);
    }
  }

  if (room === null) {
    return <div className="glass-card p-10 text-center text-text-muted">Room not found. Check the code and try again.</div>;
  }
  if (!room) {
    return <div className="glass-card p-10 text-center text-text-muted">Joining room…</div>;
  }
  if (room.status !== "approved" && user && room.hostUid !== user.uid) {
    return <div className="glass-card p-10 text-center text-text-muted">This room is awaiting approval. The host can play now; others can join once it is approved.</div>;
  }
  if (room.active === false) {
    return (
      <div className="glass-card p-10 text-center space-y-3">
        <h2 className="font-black text-text">This room has ended</h2>
        <p className="text-sm text-text-muted">The host closed the session. Start a fresh room and invite the same crew.</p>
        <Link to="/room" className="btn-primary inline-flex">Find another room</Link>
      </div>
    );
  }

  const timerLabel = timer.phase === "break" ? "Break" : timer.phase === "done" ? "Complete" : "Focus";
  const timerColor = timer.phase === "break" ? "var(--accent, #f59e0b)" : "var(--primary)";
  const timerPct = timer.phase === "break"
    ? Math.min(100, (remaining / Math.max(1, timer.breakMinutes * 60_000)) * 100)
    : Math.min(100, (remaining / Math.max(1, timer.focusMinutes * 60_000)) * 100);

  return (
    <div className="space-y-4">
      <section className="glass-card p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-black text-text flex items-center gap-2"><Users size={18} className="text-primary" /> {room.subject} study room</h2>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{room.exam}</span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>{room.visibility === "private" ? "Private" : "Public"}</span>
            </div>
            <p className="text-sm text-text-muted mt-1">{room.goal || "Study together, stay focused."}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-500"><span className="w-2 h-2 rounded-full bg-green-500" /> {onlineCount} online</span>
              <span className="text-xs text-text-muted">{members.length} member{members.length === 1 ? "" : "s"}</span>
              <span className="text-xs text-text-muted">Host {room.hostName}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={copyLink} className="btn-secondary px-3 text-sm">
              {copied ? <Check size={15} /> : <Copy size={15} />} {code}
            </button>
            {isHost && <button onClick={() => setSettingsOpen(true)} className="btn-secondary px-3 text-sm"><Settings size={15} /></button>}
            <Link to="/room" className="btn-secondary px-3 text-sm"><ArrowLeft size={15} /> Rooms</Link>
          </div>
        </div>
        {room.pinnedMessage && (
          <div className="rounded-xl border-l-4 border-primary bg-primary/10 p-3 text-sm text-text mt-3">
            <strong className="text-primary">Pinned:</strong> {room.pinnedMessage}
          </div>
        )}
      </section>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-4">
        <div className="space-y-4 min-w-0">
          <section className="glass-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Shared focus timer</p>
                <p className="text-sm font-bold text-text">{timerLabel} · round {timer.round || 1} of {timer.rounds || 4}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black tabular-nums" style={{ color: timerColor }}>{formatRoomClock(remaining)}</div>
                <p className="text-[11px] text-text-muted">{timer.focusMinutes || 25}m focus / {timer.breakMinutes || 5}m break</p>
              </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
              <div style={{ width: `${timerPct}%`, height: "100%", background: timerColor, transition: "width .5s linear" }} />
            </div>
            {isHost && (
              <div className="flex gap-2 flex-wrap mt-3">
                {timer.running ? (
                  <button onClick={() => pauseRoomTimer(code, room.timer)} className="btn-secondary text-sm"><Pause size={14} /> Pause</button>
                ) : (
                  <button onClick={() => startRoomTimer(code, room.timer)} className="btn-primary text-sm"><Play size={14} /> Start focus</button>
                )}
                <button onClick={() => advanceRoomTimer(code, room.timer)} className="btn-secondary text-sm"><SkipForward size={14} /> Next phase</button>
                <button onClick={() => resetRoomTimer(code, room.timer)} className="btn-secondary text-sm"><RotateCcw size={14} /> Reset</button>
              </div>
            )}
          </section>

          {q ? (
            <section className="glass-card p-5 md:p-6">
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <span className="text-xs font-black uppercase tracking-widest text-text-muted">Question {idx + 1} of {questions.length}</span>
                  {q.topic && <span className="text-xs text-text-muted"> · {q.topic}</span>}
                </div>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <button key={i} onClick={() => setIdx(i)}
                      style={{
                        width: 26, height: 26, borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: "pointer",
                        background: answers[questions[i].id] !== undefined ? "var(--primary)" : "var(--bg-3)",
                        color: answers[questions[i].id] !== undefined ? "#fff" : "var(--text-muted)",
                        border: i === idx ? "2px solid var(--primary)" : "1px solid var(--border)",
                      }}>{i + 1}</button>
                  ))}
                </div>
              </div>
              <p className="text-base md:text-lg font-semibold mb-4" style={{ lineHeight: 1.6 }}>{q.question}</p>
              <div className="grid gap-2">
                {Object.entries(q.options || {}).map(([letter, text]) => {
                  const picked = answers[q.id];
                  const done = picked !== undefined;
                  const correctLetter = results[q.id]?.correctAnswer;
                  const isRight = done && correctLetter ? letter === correctLetter : letter === (q.correctAnswer || q.answer);
                  return (
                    <button key={letter} onClick={() => answer(letter)} disabled={done}
                      style={{
                        textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: done ? "default" : "pointer",
                        fontSize: 14, fontFamily: "inherit",
                        background: done && isRight ? "rgb(var(--success-rgb) / 0.15)" : done && picked === letter ? "rgb(var(--danger-rgb) / 0.12)" : "var(--bg-3)",
                        border: done && (isRight || picked === letter) ? `2px solid ${isRight ? "var(--success)" : "var(--danger)"}` : "1px solid var(--border)",
                        color: "var(--text)",
                      }}>
                      <strong style={{ marginRight: 10 }}>{letter}</strong> {text} {done && isRight ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <button onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0} className="btn-secondary px-4 text-sm">Prev</button>
                <button onClick={() => setIdx((v) => Math.min(questions.length - 1, v + 1))} disabled={idx >= questions.length - 1} className="btn-secondary px-4 text-sm">Next</button>
                <button onClick={explain} disabled={aiBusy} className="btn-secondary text-sm ml-auto"><Sparkles size={14} /> {aiBusy ? "Thinking…" : "AI explain"}</button>
                <button onClick={() => setNotepad(true)} className="btn-secondary text-sm"><NotebookPen size={14} /> Notepad</button>
              </div>
              {aiText && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 mt-3 text-sm whitespace-pre-wrap text-text">
                  <div className="flex items-center justify-between mb-1"><strong className="text-primary">AI study coach</strong><button onClick={() => setAiText("")} className="text-text-muted"><X size={14} /></button></div>
                  {aiText}
                </div>
              )}
            </section>
          ) : (
            <section className="glass-card p-10 text-center text-text-muted">No questions in this room.</section>
          )}

          {room.showLeaderboard !== false && (
            <section className="glass-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-text flex items-center gap-2"><Trophy size={17} className="text-accent" /> Live leaderboard</h3>
                <span className="text-xs text-text-muted">Updates as answers are graded</span>
              </div>
              <div className="space-y-2">
                {members.map((m) => {
                  const pct = m.total > 0 ? Math.round(((m.answered || 0) / m.total) * 100) : 0;
                  const acc = m.answered > 0 ? Math.round(((m.correct || 0) / m.answered) * 100) : null;
                  return (
                    <div key={m.uid} className="flex items-center gap-3">
                      <span className="text-sm font-bold w-24 truncate" style={{ color: m.uid === user?.uid ? "var(--primary)" : "var(--text)" }}>{m.name}{m.uid === user?.uid ? " (you)" : ""}</span>
                      <PresenceBadge presence={presence[m.uid]} label={false} />
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", transition: "width .4s ease" }} />
                      </div>
                      <span className="text-xs font-bold text-text-muted w-24 text-right tabular-nums">{m.answered}/{m.total}{acc !== null ? ` · ${acc}%` : ""}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <aside className="hidden lg:flex flex-col glass-card p-4 max-h-[72vh] sticky top-4">
          <ChatPanel
            room={room} chat={chat} user={user} presence={presence}
            chatText={chatText} setChatText={setChatText}
            onSend={sendChat} onDelete={(id) => deleteRoomChatMessage(code, id).catch(() => {})}
            onPin={(text) => setRoomPinnedMessage(code, text).catch(() => {})}
            isHost={isHost}
          />
        </aside>
      </div>

      <button onClick={() => setChatOpen(true)} className="lg:hidden fixed bottom-5 right-5 z-40 btn-primary px-4 py-3 rounded-2xl shadow-xl">
        <MessageSquare size={18} /> Chat {chat.length > 0 ? `(${chat.length})` : ""}
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button className="absolute inset-0 bg-black/50" onClick={() => setChatOpen(false)} aria-label="Close chat" />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm flex flex-col border-l border-border p-4" style={{ background: "var(--bg-2)" }}>
            <button onClick={() => setChatOpen(false)} className="self-end text-text-muted mb-2"><X size={18} /></button>
            <ChatPanel
              room={room} chat={chat} user={user} presence={presence}
              chatText={chatText} setChatText={setChatText}
              onSend={sendChat} onDelete={(id) => deleteRoomChatMessage(code, id).catch(() => {})}
              onPin={(text) => setRoomPinnedMessage(code, text).catch(() => {})}
              isHost={isHost}
            />
          </div>
        </div>
      )}

      {settingsOpen && isHost && (
        <RoomSettings room={room} onClose={() => setSettingsOpen(false)} onSave={async (patch) => {
          await updateRoomSettings(code, patch);
          setSettingsOpen(false);
          toast({ message: "Room updated", type: "success" });
        }} />
      )}

      <NotepadDrawer open={notepad} onClose={() => setNotepad(false)} context={q?.question || ""} />
    </div>
  );
}

function ChatPanel({ room, chat, user, presence, chatText, setChatText, onSend, onDelete, onPin, isHost }) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-black text-text flex items-center gap-2"><MessageSquare size={16} className="text-primary" /> Room chat</h3>
        <PresenceBadge presence={presence[user?.uid]} label={false} />
      </div>
      <p className="text-[11px] text-text-muted mb-2">{room.allowChat === false ? "Chat is paused by the host." : "Ask, explain, encourage. Keep it kind."}</p>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {chat.length === 0 && <p className="text-sm text-text-muted">No messages yet. Say hello or share a study tip.</p>}
        {chat.map((m) => (
          <div key={m.id} className={`rounded-2xl p-2.5 text-sm ${m.fromUid === user?.uid ? "bg-primary/10 ml-6" : "bg-bg-3 mr-6"}`}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-muted">{m.fromName || "Student"}</span>
              <PresenceBadge presence={presence[m.fromUid]} label={false} />
              {isHost && (
                <span className="ml-auto flex gap-1">
                  <button onClick={() => onPin(m.text)} title="Pin message" className="text-text-muted"><Target size={11} /></button>
                  <button onClick={() => onDelete(m.id)} title="Delete message" className="text-text-muted"><X size={11} /></button>
                </span>
              )}
            </div>
            <div className="text-text whitespace-pre-wrap mt-0.5">{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          value={chatText}
          onChange={(e) => setChatText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSend(); }}
          placeholder={room.allowChat === false ? "Chat paused" : "Message the room…"}
          className="input-field text-sm"
          disabled={room.allowChat === false}
        />
        <button onClick={onSend} disabled={room.allowChat === false || !chatText.trim()} className="btn-primary px-3 disabled:opacity-50"><Send size={15} /></button>
      </div>
    </>
  );
}

function RoomSettings({ room, onClose, onSave }) {
  const timer = room.timer || TIMER_DEFAULTS;
  const [form, setForm] = useState({
    goal: room.goal || "",
    rules: room.rules || "",
    allowChat: room.allowChat !== false,
    showLeaderboard: room.showLeaderboard !== false,
    visibility: room.visibility || "public",
    focusMinutes: timer.focusMinutes || 25,
    breakMinutes: timer.breakMinutes || 5,
    rounds: timer.rounds || 4,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const focusMs = Math.max(1, Number(form.focusMinutes) || 25) * 60_000;
      await onSave({
        goal: form.goal,
        rules: form.rules,
        allowChat: form.allowChat,
        showLeaderboard: form.showLeaderboard,
        visibility: form.visibility,
        timer: {
          ...timer,
          focusMinutes: Math.max(1, Number(form.focusMinutes) || 25),
          breakMinutes: Math.max(1, Number(form.breakMinutes) || 5),
          rounds: Math.max(1, Number(form.rounds) || 4),
          remainingMs: timer.running ? timer.remainingMs : focusMs,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="Close settings" />
      <div className="relative glass-card w-full max-w-lg p-5 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-text">Room settings</h3>
          <button onClick={onClose} className="text-text-muted"><X size={18} /></button>
        </div>
        <input value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} placeholder="Today's goal" className="input-field" maxLength={160} />
        <textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Room rules" rows={3} className="input-field" maxLength={500} />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs font-bold text-text-muted">Focus<input type="number" min="1" max="120" value={form.focusMinutes} onChange={(e) => setForm({ ...form, focusMinutes: e.target.value })} className="input-field mt-1" /></label>
          <label className="text-xs font-bold text-text-muted">Break<input type="number" min="1" max="60" value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: e.target.value })} className="input-field mt-1" /></label>
          <label className="text-xs font-bold text-text-muted">Rounds<input type="number" min="1" max="12" value={form.rounds} onChange={(e) => setForm({ ...form, rounds: e.target.value })} className="input-field mt-1" /></label>
        </div>
        <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="input-field">
          <option value="public">Public room</option>
          <option value="private">Private room</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={form.allowChat} onChange={(e) => setForm({ ...form, allowChat: e.target.checked })} /> Allow chat</label>
        <label className="flex items-center gap-2 text-sm text-text"><input type="checkbox" checked={form.showLeaderboard} onChange={(e) => setForm({ ...form, showLeaderboard: e.target.checked })} /> Show leaderboard</label>
        <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? "Saving…" : "Save room settings"}</button>
      </div>
    </div>
  );
}

export default function StudyRoom() {
  const { code } = useParams();
  return (
    <div className="page-content max-w-6xl mx-auto space-y-6">
      <Link to="/study-partners" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Partners
      </Link>
      <header>
        <h1 className="type-h1">Study Room {code ? <span className="font-mono text-primary">· {code}</span> : ""}</h1>
        <p className="lead">Same questions, shared focus, live chat. Built for study crews and tutorial groups.</p>
      </header>
      {code ? <RoomView code={code} /> : <Lobby />}
    </div>
  );
}

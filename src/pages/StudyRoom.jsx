// src/pages/StudyRoom.jsx — shared study rooms: one code, same questions,
// live progress bars for everyone inside. Lobby (create/join) + room view.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { createRoom, joinRoom, submitRoomAnswer, subscribeRoom, subscribeApprovedRooms } from "../lib/rooms";
import { JAMB_SUBJECTS } from "../data/subjects";
import { ArrowLeft, Users, Copy, Check } from "lucide-react";

function Lobby() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [subject, setSubject] = useState("Physics");
  const [count, setCount] = useState(10);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [publicRooms, setPublicRooms] = useState([]);

  useEffect(() => {
    const unsub = subscribeApprovedRooms(setPublicRooms, 20);
    return () => unsub && unsub();
  }, []);

  async function handleCreate() {
    if (!user) return navigate("/auth");
    setBusy(true);
    try {
      const { code: c } = await createRoom({
        subject, count: Number(count) || 10, exam: "JAMB",
        hostUid: user.uid, hostName: user.displayName || "Student",
      });
      toast({ message: `Room ${c} created — share the code with friends to join instantly!`, type: "success" });
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
      await joinRoom(code, { uid: user.uid, name: user.displayName || "Student" });
      navigate(`/room/${code.trim().toUpperCase()}`);
    } catch (e) {
      toast({ message: e.message || "Could not join room", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      <div>
        <h2 className="font-black text-text text-lg mb-1">Start a room</h2>
        <p className="text-sm text-text-muted">Everyone answers the same questions. Watch each other climb live.</p>
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field flex-1">
            {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.icon} {s.name}</option>)}
          </select>
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="input-field" style={{ maxWidth: 140 }}>
            {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} Qs</option>)}
          </select>
          <button onClick={handleCreate} disabled={busy} className="btn-primary disabled:opacity-60 whitespace-nowrap">
            {busy ? "Creating…" : "Create room"}
          </button>
        </div>
      </div>
      <div className="border-t border-border pt-6">
        <h2 className="font-black text-text text-lg mb-1">Join a room</h2>
        <div className="flex gap-2 mt-4">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ROOM-XXXXXX"
            className="input-field flex-1 font-mono tracking-widest" maxLength={11} />
          <button onClick={handleJoin} disabled={busy} className="btn-secondary px-6 disabled:opacity-60 whitespace-nowrap">Join</button>
        </div>
      </div>
      {publicRooms.length > 0 && (
        <div className="border-t border-border pt-6">
          <h2 className="font-black text-text text-lg mb-1">Public rooms</h2>
          <p className="text-sm text-text-muted mb-3">Approved by ExamPadi — open to everyone.</p>
          <div className="space-y-2">
            {publicRooms.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold font-mono">{r.code}</div>
                  <div className="text-xs text-text-muted">{r.exam} · {r.subject} · host {r.hostName}</div>
                </div>
                <button onClick={async () => {
                  if (!user) return navigate("/auth");
                  setBusy(true);
                  try {
                    await joinRoom(r.code, { uid: user.uid, name: user.displayName || "Student" });
                    navigate(`/room/${r.code}`);
                  } catch (e) {
                    toast({ message: e.message || "Could not join room", type: "error" });
                  } finally {
                    setBusy(false);
                  }
                }} disabled={busy} className="btn-primary px-4 text-sm disabled:opacity-60">Join</button>
              </div>
            ))}
          </div>
        </div>
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

  useEffect(() => {
    if (!user) return;
    joinRoom(code, { uid: user.uid, name: user.displayName || "Student" }).catch(() => {});
    const unsub = subscribeRoom(code, setRoom);
    return () => unsub && unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, user?.uid]);

  const questions = room?.questions || [];
  const q = questions[idx];

  async function answer(letter) {
    if (!q || answers[q.id] !== undefined || grading) return;
    const next = { ...answers, [q.id]: letter };
    setAnswers(next);
    setGrading(q.id);
    try {
      // Server grades against the hidden key and updates progress; the room
      // subscription streams the new leaderboard live.
      const verdict = await submitRoomAnswer(code, { questionId: q.id, answer: letter });
      setResults((r) => ({ ...r, [q.id]: verdict }));
    } catch (e) {
      // Un-answer so the student can retry; nothing was counted.
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
      toast({ message: "Room link copied — send it to friends", type: "success" });
    } catch {
      toast({ message: link, type: "info" });
    }
  }

  if (room === null) {
    return <div className="glass-card p-10 text-center text-text-muted">Room not found. Check the code and try again.</div>;
  }
  if (!room) {
    return <div className="glass-card p-10 text-center text-text-muted">Joining room…</div>;
  }
  if (room.status !== "approved" && user && room.hostUid !== user.uid) {
    return <div className="glass-card p-10 text-center text-text-muted">This room is awaiting admin approval. The host can play now — you'll be able to join once it's approved.</div>;
  }

  const members = Object.entries(room.progress || {})
    .map(([uid, p]) => ({ uid, ...p }))
    .sort((a, b) => (b.correct || 0) - (a.correct || 0) || (b.answered || 0) - (a.answered || 0));

  return (
    <div className="space-y-4">
      {/* Live progress */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-black text-text flex items-center gap-2"><Users size={17} className="text-primary" /> Live room · {room.subject}</h2>
          <button onClick={copyLink} className="btn-secondary px-4 text-sm">
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied!" : code}
          </button>
        </div>
        <div className="space-y-2">
          {members.map((m) => {
            const pct = m.total > 0 ? Math.round(((m.answered || 0) / m.total) * 100) : 0;
            const acc = m.answered > 0 ? Math.round(((m.correct || 0) / m.answered) * 100) : null;
            return (
              <div key={m.uid} className="flex items-center gap-3">
                <span className="text-sm font-bold w-28 truncate" style={{ color: m.uid === user?.uid ? "var(--primary)" : "var(--text)" }}>
                  {m.name}{m.uid === user?.uid ? " (you)" : ""}
                </span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-3)" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--primary)", transition: "width 0.4s ease" }} />
                </div>
                <span className="text-xs font-bold text-text-muted w-24 text-right tabular-nums">
                  {m.answered}/{m.total}{acc !== null ? ` · ${acc}%` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Question */}
      {q ? (
        <div className="glass-card p-5 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-widest text-text-muted">Q{idx + 1}/{questions.length}{q.topic ? ` · ${q.topic}` : ""}</span>
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
              // results[q.id] comes from the server verdict (api/room-answer).
              // New rooms never embed correctAnswer — grading is server-only.
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
          <div className="flex gap-2 mt-4">
            <button onClick={() => setIdx((v) => Math.max(0, v - 1))} disabled={idx === 0} className="btn-secondary px-5 text-sm">← Prev</button>
            <button onClick={() => setIdx((v) => Math.min(questions.length - 1, v + 1))} disabled={idx >= questions.length - 1} className="btn-secondary px-5 text-sm">Next →</button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-text-muted">No questions in this room.</div>
      )}
    </div>
  );
}

export default function StudyRoom() {
  const { code } = useParams();
  return (
    <div className="page-content max-w-3xl mx-auto space-y-6">
      <Link to="/study-partners" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600 }}>
        <ArrowLeft size={16} /> Partners
      </Link>
      <header>
        <h1 className="type-h1">Study Room {code ? <span className="font-mono text-primary">· {code}</span> : ""}</h1>
        <p className="lead">Same questions, live progress. Perfect for tutorial groups and classrooms.</p>
      </header>
      {code ? <RoomView code={code} /> : <Lobby />}
    </div>
  );
}

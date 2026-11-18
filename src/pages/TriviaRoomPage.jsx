// Live trivia room — real-time 1v1 quiz with a shared question set, live
// scores, per-question timer, and a winner. Create a room and share the code.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import ProGate from "../components/ProGate";
import {
  createTriviaRoom, joinTriviaRoom, subscribeTriviaRoom,
  submitTriviaAnswer, advanceTrivia, leaveTriviaRoom,
} from "../lib/games/triviaRooms";
import { ArrowLeft, Copy, Check, Users, Loader2, Share2, Timer, Zap } from "lucide-react";

function tsMs(v) {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (v.toMillis) return v.toMillis();
  if (v.seconds) return v.seconds * 1000;
  return 0;
}

export default function TriviaRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [form, setForm] = useState({ subject: "Mixed", count: 8, timePerQuestion: 20 });
  const advancing = useRef(false);

  const normalized = String(code || "").trim().toUpperCase();

  useEffect(() => {
    if (!normalized) return;
    const unsub = subscribeTriviaRoom(normalized, setRoom);
    return () => unsub && unsub();
  }, [normalized]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  const isHost = room && user && room.hostUid === user.uid;
  const isGuest = room && user && room.guestUid === user.uid;
  const q = room?.questions?.[room?.currentIndex || 0];
  const myAnswer = q && room?.answers?.[user?.uid]?.[q.id];
  const hostAns = q && room?.answers?.[room?.hostUid]?.[q.id];
  const guestAns = q && room?.answers?.[room?.guestUid]?.[q.id];
  const bothAnswered = Boolean(hostAns && guestAns);

  const remaining = useMemo(() => {
    if (!room || room.status !== "active" || !room.timePerQuestion) return null;
    const started = tsMs(room.questionStartedAt);
    if (!started) return room.timePerQuestion;
    return Math.max(0, Math.ceil((started + room.timePerQuestion * 1000 - now) / 1000));
  }, [room, now]);

  // Host advances when both answered or the timer runs out.
  useEffect(() => {
    if (!isHost || !room || room.status !== "active" || advancing.current) return;
    const timeUp = remaining !== null && remaining <= 0;
    if (bothAnswered || timeUp) {
      advancing.current = true;
      advanceTrivia(normalized, room).finally(() => setTimeout(() => { advancing.current = false; }, 1200));
    }
  }, [isHost, room, bothAnswered, remaining, normalized]);

  async function answer(letter) {
    if (!q || myAnswer || room?.status !== "active") return;
    const correct = letter === q.answer;
    try {
      await submitTriviaAnswer(normalized, { uid: user.uid, qid: q.id, letter, correct });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  async function createRoom() {
    if (!user) return;
    setCreating(true);
    try {
      const c = await createTriviaRoom({
        hostUid: user.uid,
        hostName: user.displayName || "Player 1",
        subject: form.subject,
        count: Number(form.count) || 8,
        timePerQuestion: Number(form.timePerQuestion) || 0,
      });
      navigate(`/games/trivia/room/${c}`);
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    if (!user || !joinCode.trim()) return;
    try {
      await joinTriviaRoom(joinCode.trim().toUpperCase(), { uid: user.uid, name: user.displayName || "Player 2" });
      navigate(`/games/trivia/room/${joinCode.trim().toUpperCase()}`);
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/games/trivia/room/${normalized}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    toast({ message: "Invite link copied", type: "success" });
  }

  function shareWhatsApp() {
    const link = `${window.location.origin}/games/trivia/room/${normalized}`;
    const msg = encodeURIComponent(`🧠 Live trivia challenge on ExamPadi!\n\nJoin my room: ${normalized}\n${link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  if (!isPro) return <ProGate feature="Live Trivia"><div style={{ height: 300 }} /></ProGate>;

  // Lobby
  if (!normalized) {
    return (
      <div className="page-content max-w-2xl mx-auto space-y-4">
        <Link to="/games" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text-muted)" }}><ArrowLeft size={16} /> Games</Link>
        <h1 className="text-xl font-black flex items-center gap-2"><Zap size={18} className="text-primary" /> Live Trivia — play a friend</h1>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="glass-card p-5">
            <h2 className="font-black text-text mb-1">Create a room</h2>
            <p className="text-xs text-text-muted mb-3">Same questions, live scores, first to the top wins.</p>
            <label className="text-xs font-bold text-text-muted mb-1 block">Subject</label>
            <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field mb-2">
              {["Mixed", "Use of English Language", "Mathematics", "Physics", "Chemistry", "Biology", "Economics", "Government"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <label className="text-xs font-bold text-text-muted">Questions
                <select value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className="input-field mt-1">
                  {[5, 8, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-text-muted">Seconds / Q
                <select value={form.timePerQuestion} onChange={(e) => setForm({ ...form, timePerQuestion: e.target.value })} className="input-field mt-1">
                  {[0, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n === 0 ? "No timer" : n}</option>)}
                </select>
              </label>
            </div>
            <button onClick={createRoom} disabled={creating} className="btn-primary w-full">
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />} Create room
            </button>
          </div>
          <div className="glass-card p-5">
            <h2 className="font-black text-text mb-1">Join a room</h2>
            <p className="text-xs text-text-muted mb-3">Enter the code your friend shared.</p>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="QUIZ-XXXXXX" className="input-field mb-2 font-mono tracking-widest" />
            <button onClick={joinRoom} disabled={!joinCode.trim()} className="btn-secondary w-full">Join room</button>
          </div>
        </div>
      </div>
    );
  }

  if (!room) return <div className="glass-card p-10 text-center text-text-muted">Loading room…</div>;

  if (room.status === "waiting") {
    return (
      <div className="page-content max-w-2xl mx-auto space-y-4">
        <h1 className="text-xl font-black">Waiting for opponent…</h1>
        <div className="glass-card p-6 text-center">
          <div className="text-xs text-text-muted mb-1">Share this code:</div>
          <div className="text-2xl font-black font-mono tracking-widest mb-3" style={{ color: "var(--primary)" }}>{normalized}</div>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={copyLink} className="btn-secondary px-4">{copied ? <Check size={15} /> : <Copy size={15} />} Copy link</button>
            <button onClick={shareWhatsApp} className="btn-primary px-4"><Share2 size={15} /> WhatsApp</button>
          </div>
          <p className="text-xs text-text-muted mt-3">The quiz starts automatically when your friend joins.</p>
        </div>
      </div>
    );
  }

  if (room.status === "finished") {
    const hostScore = room.scores?.[room.hostUid] || 0;
    const guestScore = room.scores?.[room.guestUid] || 0;
    const iWon = (isHost && hostScore > guestScore) || (isGuest && guestScore > hostScore);
    const draw = hostScore === guestScore;
    return (
      <div className="page-content max-w-lg mx-auto space-y-4">
        <div className="glass-card p-6 text-center" style={{ borderColor: iWon ? "var(--success)" : "var(--border)" }}>
          <div style={{ fontSize: 44 }}>{draw ? "🤝" : iWon ? "🏆" : "🧠"}</div>
          <h1 className="text-2xl font-black mt-2">{draw ? "It's a draw!" : iWon ? "You won!" : "Opponent won"}</h1>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div><div className="text-2xl font-black" style={{ color: "var(--primary)" }}>{hostScore}</div><div className="text-xs text-text-muted">{room.hostName}</div></div>
            <div className="text-text-muted">vs</div>
            <div><div className="text-2xl font-black" style={{ color: "var(--accent)" }}>{guestScore}</div><div className="text-xs text-text-muted">{room.guestName}</div></div>
          </div>
          <div className="flex gap-2 justify-center mt-5">
            <button onClick={() => navigate("/games/trivia/room")} className="btn-primary px-4">New game</button>
            <button onClick={shareWhatsApp} className="btn-secondary px-4"><Share2 size={14} /> Share</button>
          </div>
        </div>
      </div>
    );
  }

  // Active
  const myScore = room.scores?.[user?.uid] || 0;
  const oppUid = isHost ? room.guestUid : room.hostUid;
  const oppScore = room.scores?.[oppUid] || 0;
  const oppName = isHost ? room.guestName : room.hostName;

  return (
    <div className="page-content max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-black flex items-center gap-2"><Zap size={17} className="text-primary" /> Live Trivia · {normalized}</h1>
        <div className="flex items-center gap-3 text-sm">
          <span style={{ color: "var(--primary)", fontWeight: 800 }}>You {myScore}</span>
          <span className="text-text-muted">vs</span>
          <span style={{ color: "var(--accent)", fontWeight: 800 }}>{oppName} {oppScore}</span>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-text-muted">Question {(room.currentIndex || 0) + 1} / {room.questions.length}</span>
          {remaining !== null && (
            <span className="inline-flex items-center gap-1 text-sm font-black" style={{ color: remaining <= 5 ? "var(--danger)" : "var(--text)" }}>
              <Timer size={14} /> {remaining}s
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold mb-4" style={{ lineHeight: 1.5 }}>{q?.question}</h2>
        <div className="grid gap-2">
          {q && Object.entries(q.options || {}).map(([letter, text]) => {
            const picked = myAnswer === letter;
            const revealed = Boolean(myAnswer);
            const isCorrect = letter === q.answer;
            return (
              <button key={letter} onClick={() => answer(letter)} disabled={revealed}
                style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontFamily: "inherit",
                  background: revealed && isCorrect ? "rgba(74,222,128,0.15)" : revealed && picked ? "rgba(255,77,106,0.12)" : "var(--bg-3)",
                  border: revealed && isCorrect ? "1.5px solid var(--success)" : revealed && picked ? "1.5px solid var(--danger)" : "1px solid var(--border)",
                  color: "var(--text)", cursor: revealed ? "default" : "pointer",
                }}>
                <strong style={{ marginRight: 8 }}>{letter}</strong>{text}
              </button>
            );
          })}
        </div>
        {myAnswer && (
          <p className="text-xs text-text-muted mt-3">
            {bothAnswered ? "Both answered — next question…" : "Waiting for opponent…"}
          </p>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => { leaveTriviaRoom(normalized, user.uid); navigate("/games"); }} className="btn-secondary text-xs px-3 py-2">Leave</button>
        <span className="text-xs text-text-muted">Live · updates in real time</span>
      </div>
    </div>
  );
}
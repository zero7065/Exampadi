// Chess multiplayer room — create/join with code, play on app with timer.
// Both players sync moves live; either can create a room and share the code/link.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Chess } from "chess.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import ProGate from "../components/ProGate";
import {
  createChessRoom, joinChessRoom, subscribeChessRoom, syncChessMove, finishChessRoom, resignChessRoom,
} from "../lib/games/chessMultiplayer";
import { ArrowLeft, Copy, Check, Clock, Flag, Handshake, Users, Loader2, Share2, Crown, Timer } from "lucide-react";

const PIECE_GLYPH = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function fmt(ms) {
  if (!ms && ms !== 0) return "∞";
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function ChessRoomPage() {
  const { code } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [game, setGame] = useState(() => new Chess());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const [creating, setCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [tc, setTc] = useState("unlimited");
  const [customMin, setCustomMin] = useState(10);

  const normalized = String(code || "").trim().toUpperCase();
  const isHost = room && user && room.hostUid === user.uid;
  const isGuest = room && user && room.guestUid === user.uid;
  const myColor = isHost ? "w" : isGuest ? "b" : null;
  const playerTurn = myColor ? game.turn() === myColor : true;
  const gameOver = game.isGameOver() || room?.status === "finished";

  useEffect(() => {
    if (!normalized) return;
    const unsub = subscribeChessRoom(normalized, (r) => {
      setRoom(r);
      if (r?.fen) {
        try {
          const g = new Chess(r.fen);
          setGame(g);
          setLastMove(r.lastMove || null);
          if (typeof r.whiteTimeMs === "number") setWhiteMs(r.whiteTimeMs);
          if (typeof r.blackTimeMs === "number") setBlackMs(r.blackTimeMs);
        } catch { /* invalid fen */ }
      }
    });
    return () => unsub && unsub();
  }, [normalized]);

  // Clock tick
  useEffect(() => {
    if (!room || room.status !== "active" || room.timeControl === "unlimited") return;
    const t = setInterval(() => {
      setNow(Date.now());
      setWhiteMs((w) => (game.turn() === "w" ? Math.max(0, w - 1000) : w));
      setBlackMs((b) => (game.turn() === "b" ? Math.max(0, b - 1000) : b));
    }, 1000);
    return () => clearInterval(t);
  }, [room, game]);

  // Time forfeit check
  useEffect(() => {
    if (!room || room.timeControl === "unlimited" || room.status !== "active") return;
    if (whiteMs <= 0 && game.turn() === "w") {
      finishChessRoom(normalized, { result: "timeout", winnerUid: room.guestUid, winnerName: room.guestName, reason: "white timeout" });
    } else if (blackMs <= 0 && game.turn() === "b") {
      finishChessRoom(normalized, { result: "timeout", winnerUid: room.hostUid, winnerName: room.hostName, reason: "black timeout" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteMs, blackMs]);

  const myTurn = playerTurn && !gameOver && room?.status === "active";

  async function makeMove(from, to) {
    try {
      const g = new Chess(game.fen());
      const applied = g.move({ from, to, promotion: "q" });
      if (!applied) return;
      setLastMove({ from, to });
      setGame(g);
      setSelected(null);
      setLegalMoves([]);
      const nextWhite = game.turn() === "w" ? whiteMs : whiteMs;
      await syncChessMove(normalized, {
        fen: g.fen(),
        pgn: g.pgn(),
        turn: g.turn(),
        lastMove: { from, to },
        whiteTimeMs: game.turn() === "w" ? whiteMs - 2000 : whiteMs,
        blackTimeMs: game.turn() === "b" ? blackMs - 2000 : blackMs,
      });
      if (g.isCheckmate()) {
        const winner = g.turn() === "w" ? "b" : "w";
        await finishChessRoom(normalized, {
          result: "checkmate",
          winnerUid: winner === "w" ? room.hostUid : room.guestUid,
          winnerName: winner === "w" ? room.hostName : room.guestName,
          reason: "checkmate",
        });
      } else if (g.isDraw()) {
        await finishChessRoom(normalized, { result: "draw", reason: "draw" });
      }
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function onSquareClick(square) {
    if (!myTurn) return;
    const piece = game.get(square);
    if (selected) {
      if (legalMoves.includes(square)) {
        makeMove(selected, square);
      } else if (piece && piece.color === myColor) {
        setSelected(square);
        setLegalMoves(game.moves({ square, verbose: true }).map((m) => m.to));
      } else {
        setSelected(null); setLegalMoves([]);
      }
    } else if (piece && piece.color === myColor) {
      setSelected(square);
      setLegalMoves(game.moves({ square, verbose: true }).map((m) => m.to));
    }
  }

  async function createRoom() {
    if (!user) return;
    setCreating(true);
    try {
      const c = await createChessRoom({
        hostUid: user.uid,
        hostName: user.displayName || "Player 1",
        timeControl: tc,
        customMinutes: customMin,
      });
      navigate(`/chess/room/${c}`);
    } catch (e) {
      toast({ message: e.message, type: "error" });
    } finally {
      setCreating(false);
    }
  }

  async function joinRoom() {
    if (!user || !joinCode.trim()) return;
    try {
      await joinChessRoom(joinCode.trim().toUpperCase(), { uid: user.uid, name: user.displayName || "Player 2" });
      navigate(`/chess/room/${joinCode.trim().toUpperCase()}`);
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  function copyLink() {
    const link = `${window.location.origin}/chess/room/${normalized}`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    toast({ message: "Invite link copied — send it to your opponent", type: "success" });
  }

  function shareWhatsApp() {
    const link = `${window.location.origin}/chess/room/${normalized}`;
    const msg = encodeURIComponent(`♟️ Play chess with me on ExamPadi!\n\nJoin my room: ${normalized}\n${link}`);
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  if (!isPro) {
    return <ProGate feature="Chess Multiplayer"><div style={{ height: 300 }} /></ProGate>;
  }

  // ── Lobby (no room code yet) ──
  if (!normalized) {
    return (
      <div className="page-content max-w-2xl mx-auto space-y-4">
        <Link to="/games/chess" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--text-muted)" }}><ArrowLeft size={16} /> Back to chess</Link>
        <h1 className="text-xl font-black flex items-center gap-2"><Users size={18} className="text-primary" /> Play a Friend</h1>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="glass-card p-5">
            <h2 className="font-black text-text mb-1 flex items-center gap-1"><Crown size={15} className="text-amber-500" /> Create a room</h2>
            <p className="text-xs text-text-muted mb-3">Set a time control and share the code.</p>
            <label className="text-xs font-bold text-text-muted mb-1 block">Time control</label>
            <select value={tc} onChange={(e) => setTc(e.target.value)} className="input-field mb-2">
              <option value="unlimited">Unlimited (no clock)</option>
              <option value="timed">5 min + 5 min</option>
              <option value="custom">Custom minutes</option>
            </select>
            {tc === "custom" && (
              <label className="text-xs font-bold text-text-muted mb-1 block">Minutes per side</label>
            )}
            {tc === "custom" && (
              <input type="number" min="1" max="60" value={customMin} onChange={(e) => setCustomMin(Number(e.target.value))} className="input-field mb-2" />
            )}
            <button onClick={createRoom} disabled={creating} className="btn-primary w-full">
              {creating ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />} Create room
            </button>
          </div>
          <div className="glass-card p-5">
            <h2 className="font-black text-text mb-1 flex items-center gap-1"><Timer size={15} className="text-accent" /> Join a room</h2>
            <p className="text-xs text-text-muted mb-3">Enter the code your friend shared.</p>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="CHESS-XXXXXX" className="input-field mb-2 font-mono tracking-widest" />
            <button onClick={joinRoom} disabled={!joinCode.trim()} className="btn-secondary w-full">Join room</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Room view ──
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
          <p className="text-xs text-text-muted mt-3">The game starts automatically when your friend joins.</p>
        </div>
      </div>
    );
  }

  const orientation = myColor === "b" ? "black" : "white";
  const rows = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const cols = orientation === "white" ? FILES : [...FILES].reverse();

  return (
    <div className="page-content max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/games/chess" className="p-2 rounded-lg hover:bg-subtle"><ArrowLeft size={18} /></Link>
          <h1 className="text-xl font-black flex items-center gap-2"><Users size={18} className="text-primary" /> Chess Room · {normalized}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink} className="btn-secondary px-3 text-xs">{copied ? <Check size={13} /> : <Copy size={13} />} Invite</button>
          {room.status === "active" && <button onClick={() => resignChessRoom(normalized, user.uid)} className="btn-secondary px-3 text-xs" style={{ color: "var(--danger)" }}><Flag size={13} /> Resign</button>}
        </div>
      </div>

      {room.status === "finished" && (
        <div className="glass-card p-4 text-center" style={{ borderColor: "var(--primary)" }}>
          <div className="text-lg font-black">
            {room.result === "draw" ? "🤝 Draw" : room.winnerUid === user.uid ? "🎉 You won!" : "Opponent won"}
          </div>
          <div className="text-xs text-text-muted mt-1">{room.reason || room.result} · <button onClick={() => navigate("/chess/room")} className="text-primary font-semibold">New game</button></div>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
        <div>
          {/* Opponent bar */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--bg-3)" }}>{isHost ? "👤" : "🤖"}</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text">{isHost ? (room.guestName || "Waiting…") : room.hostName}</div>
              <div className="text-[10px] text-text-muted">{room.status === "active" ? (game.turn() === (isHost ? "b" : "w") ? "To move" : "Waiting") : "—"}</div>
            </div>
            {room.timeControl !== "unlimited" && (
              <div className="font-mono text-lg font-black tabular-nums" style={{ color: (isHost ? blackMs : whiteMs) < 30000 ? "var(--danger)" : "var(--text)" }}>
                {fmt(isHost ? blackMs : whiteMs)}
              </div>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", width: "100%", maxWidth: 520, margin: "0 auto", borderRadius: 12, overflow: "hidden", border: "2px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.35)", userSelect: "none" }}>
            {rows.map((r) => cols.map((c, ci) => {
              const square = c + r;
              const piece = game.get(square);
              const isLight = (r + ci) % 2 === 0;
              const isSelected = selected === square;
              const isLegal = legalMoves.includes(square);
              const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
              return (
                <button key={square} onClick={() => onSquareClick(square)} style={{
                  aspectRatio: "1",
                  background: isSelected ? "rgba(255,235,59,0.5)" : isLast ? "rgba(255,235,59,0.25)" : isLight ? "#EBECD9" : "#739552",
                  border: "none",
                  cursor: piece && piece.color === myColor && myTurn ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(20px, 5vw, 36px)", position: "relative", padding: 0,
                }}>
                  {piece && <span style={{ color: piece.color === "w" ? "#fff" : "#000", textShadow: piece.color === "w" ? "0 1px 2px rgba(0,0,0,0.4)" : "none", lineHeight: 1 }}>{PIECE_GLYPH[piece.color][piece.type]}</span>}
                  {isLegal && !piece && <span style={{ position: "absolute", width: "28%", height: "28%", borderRadius: "50%", background: "rgba(0,0,0,0.25)" }} />}
                  {isLegal && piece && <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "4px solid rgba(0,0,0,0.25)" }} />}
                </button>
              );
            }))}
          </div>
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--primary-dim)" }}>👤</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text">You ({isHost ? "White" : "Black"})</div>
              <div className="text-[10px] text-text-muted">{myTurn ? "Your move" : gameOver ? "—" : "Opponent's move"}</div>
            </div>
            {room.timeControl !== "unlimited" && (
              <div className="font-mono text-lg font-black tabular-nums" style={{ color: (isHost ? whiteMs : blackMs) < 30000 ? "var(--danger)" : "var(--text)" }}>
                {fmt(isHost ? whiteMs : blackMs)}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="glass-card p-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2 flex items-center gap-1"><Clock size={12} /> Moves</h3>
            <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto text-xs font-mono">
              {game.history().length === 0 && <p className="text-text-muted col-span-2">No moves yet.</p>}
              {game.history().map((h, i) => (
                <div key={i} className={i % 2 === 0 ? "font-semibold" : ""} style={{ color: i % 2 === 0 ? "var(--text)" : "var(--text-muted)" }}>
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}{h}
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2">Room info</h3>
            <div className="text-xs text-text-muted space-y-1">
              <div>Opponent: <strong style={{ color: "var(--text)" }}>{isHost ? room.guestName : room.hostName}</strong></div>
              <div>Time control: <strong style={{ color: "var(--text)" }}>{room.timeControl === "unlimited" ? "Unlimited" : room.timeControl === "timed" ? "5+5 min" : `${customMin} min`}</strong></div>
              <div>Status: <strong style={{ color: "var(--text)" }}>{room.status}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
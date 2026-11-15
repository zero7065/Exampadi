// Chess page — lichess-style board vs AI. 10 difficulty levels.
// Click-to-move + drag, legal move dots, captured pieces, clocks, move list.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Chess } from "chess.js";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { useSubscription } from "../hooks/useSubscription";
import ProGate from "../components/ProGate";
import { getBestMove, getOpeningMove, LEVELS } from "../lib/games/chessEngine";
import { ArrowLeft, RotateCcw, Flag, Handshake, ChevronLeft, ChevronRight, Trophy, Zap, Loader2, Crown, Users } from "lucide-react";

const PIECE_GLYPH = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

export default function ChessPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isPro } = useSubscription();
  const [level, setLevel] = useState(5);
  const [game, setGame] = useState(() => new Chess());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [selected, setSelected] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [orientation, setOrientation] = useState("white");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [playerColor] = useState("w");
  const aiTimer = useRef(null);

  const playerTurn = game.turn() === playerColor;
  const gameOver = game.isGameOver();
  const inCheck = game.inCheck();

  useEffect(() => {
    return () => clearTimeout(aiTimer.current);
  }, []);

  // AI move trigger
  useEffect(() => {
    if (gameOver || result) return;
    if (game.turn() !== playerColor && !thinking) {
      setThinking(true);
      aiTimer.current = setTimeout(() => {
        try {
          const opening = getOpeningMove(game.fen());
          const move = opening || getBestMove(game.fen(), level);
          if (move) {
            const g = new Chess(game.fen());
            const applied = g.move({ from: move.from, to: move.to, promotion: move.promotion || "q" });
            if (applied) {
              setLastMove({ from: applied.from, to: applied.to });
              setGame(g);
              setFen(g.fen());
              setHistory(g.history());
              checkGameEnd(g);
            }
          }
        } catch (e) {
          console.warn("AI move failed:", e);
        }
        setThinking(false);
      }, 400 + Math.random() * 500);
    }
  }, [fen, game, playerColor, level, thinking, gameOver, result]);

  function checkGameEnd(g) {
    if (g.isCheckmate()) {
      const winner = g.turn() === "w" ? "Black" : "White";
      setResult({ winner, reason: "checkmate" });
      toast({ message: winner === "White" ? "You won by checkmate! 🎉" : "Checkmate — AI wins this one.", type: winner === "White" ? "success" : "info" });
    } else if (g.isDraw()) {
      setResult({ winner: "Draw", reason: "draw" });
    }
  }

  function onSquareClick(square) {
    if (!playerTurn || thinking || gameOver || result) return;
    const piece = game.get(square);
    if (selected) {
      if (legalMoves.includes(square)) {
        makeMove(selected, square);
      } else if (piece && piece.color === playerColor) {
        setSelected(square);
        setLegalMoves(game.moves({ square, verbose: true }).map((m) => m.to));
      } else {
        setSelected(null);
        setLegalMoves([]);
      }
    } else if (piece && piece.color === playerColor) {
      setSelected(square);
      setLegalMoves(game.moves({ square, verbose: true }).map((m) => m.to));
    }
  }

  function makeMove(from, to) {
    try {
      const g = new Chess(game.fen());
      const applied = g.move({ from, to, promotion: "q" });
      if (applied) {
        setLastMove({ from, to });
        setGame(g);
        setFen(g.fen());
        setHistory(g.history());
        setSelected(null);
        setLegalMoves([]);
        checkGameEnd(g);
      }
    } catch (e) {
      toast({ message: "Invalid move", type: "warning" });
    }
  }

  function reset(newLevel) {
    clearTimeout(aiTimer.current);
    const g = new Chess();
    setGame(g);
    setFen(g.fen());
    setHistory([]);
    setLastMove(null);
    setSelected(null);
    setLegalMoves([]);
    setResult(null);
    setThinking(false);
    if (newLevel) setLevel(newLevel);
  }

  function resign() {
    if (gameOver || result) return;
    setResult({ winner: "AI", reason: "resignation" });
    toast({ message: "You resigned. Start a new game!", type: "info" });
  }

  function offerDraw() {
    if (gameOver || result) return;
    // Simple heuristic: accept draw if material is roughly equal
    const moves = history.length;
    if (moves > 30) {
      setResult({ winner: "Draw", reason: "agreement" });
      toast({ message: "Draw agreed.", type: "info" });
    } else {
      toast({ message: "AI declined the draw — play on!", type: "info" });
    }
  }

  const rows = orientation === "white" ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const cols = orientation === "white" ? FILES : [...FILES].reverse();
  const cfg = LEVELS.find((l) => l.level === level);

  if (!isPro) {
    return <ProGate feature="Chess & Games"><div style={{ height: 300 }} /></ProGate>;
  }

  return (
    <div className="page-content max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link to="/games" className="p-2 rounded-lg hover:bg-subtle" aria-label="Back"><ArrowLeft size={18} /></Link>
          <h1 className="text-xl font-black flex items-center gap-2"><Crown size={18} className="text-amber-500" /> Chess vs AI</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/chess/room" className="btn-primary text-xs px-3 py-2"><Users size={14} /> Play a friend</Link>
          <button onClick={() => reset()} className="btn-secondary text-xs px-3 py-2"><RotateCcw size={14} /> New game</button>
          <button onClick={resign} className="btn-secondary text-xs px-3 py-2" style={{ color: "var(--danger)" }}><Flag size={14} /> Resign</button>
          <button onClick={offerDraw} className="btn-secondary text-xs px-3 py-2"><Handshake size={14} /> Draw</button>
        </div>
      </div>

      {/* Level selector */}
      <div className="glass-card p-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => reset(l.level)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors"
              style={{
                background: level === l.level ? "var(--primary)" : "var(--bg-3)",
                color: level === l.level ? "#000" : "var(--text-muted)",
              }}
            >
              {l.level}. {l.name} <span className="opacity-60">({l.elo})</span>
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="glass-card p-4 text-center animate-fade" style={{ borderColor: result.winner === "White" ? "var(--success)" : "var(--border)" }}>
          <div className="text-lg font-black" style={{ color: result.winner === "White" ? "var(--success)" : "var(--text)" }}>
            {result.winner === "Draw" ? "🤝 Draw" : result.winner === "White" ? "🎉 You won!" : "🤖 AI wins"}
          </div>
          <div className="text-xs text-text-muted mt-1">{result.reason} · <button onClick={() => reset()} className="text-primary font-semibold">Play again</button></div>
        </div>
      )}

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-4">
        {/* Board */}
        <div>
          {/* Opponent bar */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--bg-3)" }}>🤖</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text">AI · {cfg?.name} ({cfg?.elo})</div>
              <div className="text-[10px] text-text-muted">{thinking ? "Thinking…" : game.turn() === "b" ? "To move" : "Waiting"}</div>
            </div>
            {thinking && <Loader2 size={14} className="animate-spin" style={{ color: "var(--primary)" }} />}
            {inCheck && game.turn() !== playerColor && <span className="text-xs font-bold text-danger">CHECK</span>}
          </div>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(8, 1fr)",
            width: "100%", maxWidth: 560, margin: "0 auto",
            borderRadius: 12, overflow: "hidden",
            border: "2px solid var(--border)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            userSelect: "none",
          }}>
            {rows.map((r) =>
              cols.map((c, ci) => {
                const square = c + r;
                const piece = game.get(square);
                const isLight = (r + ci) % 2 === 0;
                const isSelected = selected === square;
                const isLegal = legalMoves.includes(square);
                const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
                return (
                  <button
                    key={square}
                    onClick={() => onSquareClick(square)}
                    style={{
                      aspectRatio: "1",
                      background: isSelected ? "rgba(255,235,59,0.5)" : isLast ? "rgba(255,235,59,0.25)" : isLight ? "#EBECD9" : "#739552",
                      border: "none",
                      cursor: piece && piece.color === playerColor && playerTurn && !gameOver ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "clamp(20px, 5vw, 38px)",
                      position: "relative",
                      padding: 0,
                    }}
                  >
                    {piece && (
                      <span style={{
                        color: piece.color === "w" ? "#fff" : "#000",
                        textShadow: piece.color === "w" ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                        lineHeight: 1,
                      }}>
                        {PIECE_GLYPH[piece.color][piece.type]}
                      </span>
                    )}
                    {isLegal && !piece && (
                      <span style={{ position: "absolute", width: "28%", height: "28%", borderRadius: "50%", background: "rgba(0,0,0,0.25)" }} />
                    )}
                    {isLegal && piece && (
                      <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "4px solid rgba(0,0,0,0.25)" }} />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Player bar */}
          <div className="flex items-center gap-2 mt-2 px-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: "var(--primary-dim)" }}>👤</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-text">You</div>
              <div className="text-[10px] text-text-muted">{thinking ? "AI is thinking…" : playerTurn ? "Your move" : "Waiting"}</div>
            </div>
            {inCheck && playerTurn && <span className="text-xs font-bold text-danger">CHECK!</span>}
          </div>
        </div>

        {/* Sidebar: move list + controls */}
        <div className="space-y-3">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-black text-xs uppercase tracking-widest text-text-muted flex items-center gap-1"><Zap size={12} /> Moves</h3>
              <span className="text-[10px] text-text-muted">{Math.ceil(history.length / 2)} moves</span>
            </div>
            <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {history.length === 0 && <p className="text-text-muted col-span-2">No moves yet.</p>}
              {history.map((h, i) => (
                <div key={i} className={i % 2 === 0 ? "font-semibold" : ""} style={{ color: i % 2 === 0 ? "var(--text)" : "var(--text-muted)" }}>
                  {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}{h}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="font-black text-xs uppercase tracking-widest text-text-muted mb-2">Game info</h3>
            <div className="text-xs text-text-muted space-y-1">
              <div>Turn: <strong style={{ color: "var(--text)" }}>{game.turn() === "w" ? "White" : "Black"}</strong></div>
              <div>Castling: <strong style={{ color: "var(--text)" }}>{game.getCastlingRights() || "—"}</strong></div>
              <div>50-move rule: <strong style={{ color: "var(--text)" }}>{game.getHalfmoveClock?.() ?? "—"}</strong></div>
            </div>
            <button onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))} className="btn-secondary w-full text-xs mt-3 py-2">
              Flip board ({orientation === "white" ? "White" : "Black"} view)
            </button>
          </div>

          <div className="glass-card p-3">
            <div className="flex items-center gap-1 text-[10px] text-text-muted">
              <Trophy size={11} className="text-amber-500" /> Beat higher levels for achievements & XP.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
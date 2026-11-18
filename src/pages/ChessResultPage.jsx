// Chess result — public, click-bait performance card.
// "Can you beat this?" — drives new signups via shared links.
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getChessResult, likeChessResult } from "../lib/games/chessResults";
import { logActivity } from "../lib/activityLog";
import { ACTIONS } from "../lib/actions";
import { Crown, Trophy, Heart, Share2, ArrowRight, Loader2, Swords, Flame } from "lucide-react";

const RESULT_LABEL = {
  win: "Won", loss: "Lost", draw: "Drew", checkmate: "Checkmate!",
  resignation: "Resigned", timeout: "Won on time",
};

export default function ChessResultPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const resultLogged = useRef(false);

  useEffect(() => {
    getChessResult(id).then((r) => setResult(r)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!result || resultLogged.current) return;
    resultLogged.current = true;
    logActivity({ action: ACTIONS.CHESS_RESULT, userId: user?.uid, email: user?.email, details: { result: result.result, id } });
  }, [result, id, user]);

  function share() {
    const link = window.location.href;
    const msg = `I ${RESULT_LABEL[result?.result]?.toLowerCase() || "played"} ${result?.mode === "ai" ? "the AI" : result?.opponentName} at Level ${result?.level} on ExamPadi! ♟️ Can you beat that?`;
    if (navigator.share) {
      navigator.share({ title: "ExamPadi Chess", text: msg, url: link }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg + "\n" + link)}`, "_blank", "noopener,noreferrer");
    }
  }

  async function like() {
    if (!user) { navigate("/auth?ref=CHESS"); return; }
    await likeChessResult(id, user.uid);
    setResult((r) => {
      const liked = (r.likes || []).includes(user.uid);
      return { ...r, likes: liked ? r.likes.filter((x) => x !== user.uid) : [...(r.likes || []), user.uid], likeCount: Math.max(0, (r.likeCount || 0) + (liked ? -1 : 1)) };
    });
  }

  if (loading) return <div className="page-content text-center" style={{ color: "var(--text-muted)" }}><Loader2 className="animate-spin mx-auto" /> Loading result…</div>;
  if (!result) return (
    <div className="page-content max-w-md mx-auto text-center space-y-3">
      <h1 className="text-xl font-black">Result not found</h1>
      <p className="text-sm text-text-muted">This result may have been removed.</p>
      <Link to="/games/chess" className="btn-primary inline-flex">Play chess</Link>
    </div>
  );

  const won = ["win", "checkmate", "timeout"].includes(result.result);
  const liked = user && (result.likes || []).includes(user.uid);

  return (
    <div className="page-content max-w-lg mx-auto space-y-4">
      <div className="glass-card p-6 text-center" style={{ borderColor: won ? "var(--success)" : "var(--border)", background: "linear-gradient(160deg, rgb(var(--primary-rgb) / 0.08), var(--bg-2))" }}>
        <div style={{ fontSize: 44 }}>{won ? "🏆" : result.result === "draw" ? "🤝" : "♟️"}</div>
        <h1 className="text-2xl font-black mt-2">
          {result.name} {RESULT_LABEL[result.result] || result.result} {result.mode === "ai" ? "the AI" : result.opponentName}
        </h1>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap text-xs">
          <span className="px-2 py-1 rounded-lg inline-flex items-center gap-1" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}><Crown size={11} /> Level {result.level} · {result.levelName}</span>
          <span className="px-2 py-1 rounded-lg inline-flex items-center gap-1" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}><Swords size={11} /> {result.moves?.length || 0} moves</span>
          <span className="px-2 py-1 rounded-lg inline-flex items-center gap-1" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}><Flame size={11} /> {result.timeControl === "unlimited" ? "No clock" : result.timeControl}</span>
        </div>

        <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
          <button onClick={like} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-1.5">
            <Heart size={14} fill={liked ? "var(--danger)" : "none"} color={liked ? "var(--danger)" : "currentColor"} /> {result.likeCount || 0}
          </button>
          <button onClick={share} className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-1.5"><Share2 size={14} /> Share</button>
        </div>

        <p className="text-xs text-text-muted mt-4">Think you can do better?</p>
        <Link to={user ? "/games/chess" : "/auth?ref=CHESS"} className="btn-primary w-full mt-2 inline-flex items-center justify-center gap-2">
          <Trophy size={16} /> {user ? "Challenge the AI now" : "Sign in & beat this"} <ArrowRight size={16} />
        </Link>
        {!user && <p className="text-[10px] text-text-muted mt-2">New here? Sign in with Google to play — free.</p>}
      </div>

      <div className="text-center">
        <Link to="/games" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Explore all games →</Link>
      </div>
    </div>
  );
}
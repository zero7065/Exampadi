// Share page — public preview of a shared question / teaser / chess challenge.
// Flow: visitor opens link → sees the challenge → signs in with Google → is
// automatically connected to the friend who shared it → can chat + reveal answer.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getSharedItem, captureFriendRefFromUrl, redeemFriendRef,
} from "../lib/friendShare";
import { Sparkles, MessageCircle, Loader2, ArrowRight, Lightbulb, Crown, Trophy } from "lucide-react";

const TYPE_META = {
  question: { icon: "📝", label: "Question challenge" },
  teaser: { icon: "💡", label: "Brain teaser" },
  chess: { icon: "♟️", label: "Chess challenge" },
  trivia: { icon: "🧠", label: "Trivia" },
};

function pairId(a, b) { return [a, b].sort().join("_"); }

export default function SharePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [connected, setConnected] = useState(null);

  useEffect(() => {
    captureFriendRefFromUrl();
    getSharedItem(id).then((r) => setItem(r)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (item && user?.uid && item.sharerUid && item.sharerUid !== user.uid) {
      redeemFriendRef(user).then((res) => { if (res) setConnected(res); });
    }
  }, [item, user]);

  if (loading) return <div className="page-content text-center" style={{ color: "var(--text-muted)" }}><Loader2 className="animate-spin mx-auto" /> Loading…</div>;
  if (!item) return (
    <div className="page-content max-w-md mx-auto text-center space-y-3">
      <h1 className="text-xl font-black">Link not found</h1>
      <p className="text-sm text-text-muted">This shared item may have expired.</p>
      <Link to="/" className="btn-primary inline-flex">Go home</Link>
    </div>
  );

  const meta = TYPE_META[item.type] || TYPE_META.question;
  const signInHref = `/auth?fref=${encodeURIComponent(item.sharerUid || "")}&fname=${encodeURIComponent(item.sharerName || "")}&next=${encodeURIComponent(`/share/${id}`)}`;

  return (
    <div className="page-content max-w-lg mx-auto space-y-4">
      <div className="glass-card p-6 space-y-4" style={{ borderColor: "rgb(var(--primary-rgb) / 0.35)", background: "linear-gradient(160deg, rgb(var(--primary-rgb) / 0.08), var(--bg-2))" }}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-2xl">{meta.icon}</span>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--primary)" }}>{meta.label}</span>
        </div>

        <div className="text-sm text-text-muted">
          <strong style={{ color: "var(--text)" }}>{item.sharerName}</strong> shared this with you on ExamPadi
        </div>

        <div>
          <h1 className="text-lg font-black text-text" style={{ lineHeight: 1.4 }}>{item.title || "Can you solve this?"}</h1>
          {item.body && <p className="text-sm text-text-muted mt-2" style={{ lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{item.body}</p>}
        </div>

        {item.options?.length > 0 && (
          <div className="space-y-2">
            {item.options.map((o, i) => (
              <div key={i} className="p-2.5 rounded-xl text-sm" style={{ background: "var(--bg-3)", border: "1px solid var(--border)" }}>
                <strong>{String.fromCharCode(65 + i)})</strong> {o}
              </div>
            ))}
          </div>
        )}

        {item.type === "chess" && item.extra?.level && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Crown size={14} className="text-amber-500" /> Level {item.extra.level} {item.extra.levelName ? `· ${item.extra.levelName}` : ""}
          </div>
        )}

        {/* Reveal answer */}
        {item.answer && (
          <div>
            {revealed ? (
              <div className="p-3 rounded-xl" style={{ background: "rgb(var(--success-rgb) / 0.1)", border: "1px solid var(--success)" }}>
                <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--success)" }}>Answer</div>
                <div className="text-sm mt-1 whitespace-pre-wrap">{item.answer}</div>
              </div>
            ) : (
              <button onClick={() => setRevealed(true)} className="btn-secondary text-xs px-4 py-2 inline-flex items-center gap-1.5">
                <Lightbulb size={13} /> Reveal answer
              </button>
            )}
          </div>
        )}

        {/* Connection / sign-in CTA */}
        {connected ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--success)" }}>
              <Sparkles size={15} /> You're now connected with {connected.partnerName}!
            </div>
            <button
              onClick={() => navigate(`/friends/chat/${pairId(user.uid, connected.partnerUid)}`)}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              <MessageCircle size={16} /> Start chatting
            </button>
          </div>
        ) : user ? (
          <Link to="/study-partners" className="btn-secondary w-full inline-flex items-center justify-center gap-2">
            <MessageCircle size={16} /> Go to Study Partners
          </Link>
        ) : (
          <div className="space-y-2">
            <Link to={signInHref} className="btn-primary w-full inline-flex items-center justify-center gap-2">
              Sign in to answer & connect <ArrowRight size={16} />
            </Link>
            <p className="text-[10px] text-text-muted text-center">Free. Sign in with Google — you'll be added as {item.sharerName}'s study partner automatically.</p>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link to="/" className="text-sm font-semibold" style={{ color: "var(--primary)" }}>Explore ExamPadi →</Link>
      </div>
    </div>
  );
}
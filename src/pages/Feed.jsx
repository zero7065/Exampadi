// Community feed: top students + public help board.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import {
  postHelpRequest, subscribeHelpRequests, replyToRequest,
  subscribeReplies, resolveRequest, getTopStudents,
} from "../lib/discussions";
import {
  subscribeApprovedReviews, toggleReviewLike, submitReview,
} from "../lib/community";
import AvatarDisplay from "../components/Avatar/AvatarDisplay";
import { getActiveBadge } from "../lib/achievements";
import { Trophy, MessageCircle, CheckCircle2, Send, ChevronDown, Sparkles, Star, ThumbsUp, PenLine } from "lucide-react";
import { JAMB_SUBJECTS } from "../data/subjects";

function ReplyThread({ request, user, userName }) {
  const [replies, setReplies] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const unsub = subscribeReplies(request.id, setReplies);
    return () => unsub && unsub();
  }, [open, request.id]);

  async function send() {
    try {
      await replyToRequest(request.id, { uid: user.uid, name: userName, text });
      setText("");
    } catch (e) {
      toast({ message: e.message || "Could not reply", type: "error" });
    }
  }

  async function resolve() {
    try {
      await resolveRequest(request.id, user.uid);
      toast({ message: "Marked as resolved ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message, type: "error" });
    }
  }

  return (
    <div className="glass-card p-4">
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <AvatarDisplay profile={{ name: request.name }} size={32} radius={16} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{request.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {request.subject}{request.topic ? ` · ${request.topic}` : ""} · {request.replyCount || 0} repl{request.replyCount === 1 ? "y" : "ies"}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase",
          background: request.status === "resolved" ? "rgb(var(--success-rgb) / 0.12)" : "rgb(var(--accent-rgb) / 0.14)",
          color: request.status === "resolved" ? "var(--success)" : "var(--accent)",
        }}>
          {request.status === "resolved" ? "Solved ✓" : "Open"}
        </span>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, margin: "0 0 10px" }}>{request.text}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setOpen((o) => !o)} className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }} aria-expanded={open}>
          <MessageCircle size={14} /> {open ? "Hide" : "Discuss"} <ChevronDown size={13} className="fold-chevron" style={{ transform: open ? "rotate(180deg)" : "none", color: "inherit" }} />
        </button>
        {request.uid === user?.uid && request.status !== "resolved" && (
          <button onClick={resolve} className="btn-secondary" style={{ padding: "8px 14px", fontSize: 13 }}>
            <CheckCircle2 size={14} /> Resolved
          </button>
        )}
        <Link to={`/u/${request.uid}`} style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "var(--primary)", alignSelf: "center" }}>Profile →</Link>
      </div>
      <div className={open ? "fold-body fold-open" : "fold-body"}>
        <div>
          <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
            {replies.map((r) => (
              <div key={r.id} style={{ background: "var(--bg-3)", borderRadius: 10, padding: "8px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--primary)" }}>{r.name}</div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>{r.text}</div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8 }}>
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Write a helpful reply…" className="input-field flex-1" />
              <button onClick={send} className="btn-primary" style={{ padding: "10px 16px" }}><Send size={15} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [top, setTop] = useState([]);
  const [requests, setRequests] = useState([]);
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [sendingReview, setSendingReview] = useState(false);

  useEffect(() => {
    getTopStudents(10).then(setTop).catch(() => {});
    const unsub = subscribeHelpRequests(setRequests, 30);
    const unsubReviews = subscribeApprovedReviews(setReviews, 12);
    return () => { unsub && unsub(); unsubReviews && unsubReviews(); };
  }, []);

  async function sendReview() {
    if (sendingReview) return;
    setSendingReview(true);
    try {
      await submitReview({
        uid: user.uid,
        name: user.displayName || "Student",
        rating: reviewRating,
        text: reviewText.trim(),
        context: "feed",
      });
      setReviewText("");
      setShowReviewForm(false);
      toast({ message: "Review submitted — it goes live after an admin approves it ⭐", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not submit", type: "error" });
    } finally {
      setSendingReview(false);
    }
  }

  async function likeReview(id) {
    try {
      const liked = await toggleReviewLike(id, user.uid);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                likes: liked ? [...(r.likes || []), user.uid] : (r.likes || []).filter((x) => x !== user.uid),
                likeCount: Math.max(0, (r.likeCount || 0) + (liked ? 1 : -1)),
              }
            : r
        )
      );
    } catch {
      toast({ message: "Could not like right now", type: "error" });
    }
  }

  async function post() {    if (posting) return;
    setPosting(true);
    try {
      await postHelpRequest({
        uid: user.uid,
        name: user.displayName || "Student",
        subject, topic: topic.trim(), text: text.trim(),
      });
      setText("");
      setTopic("");
      toast({ message: "Help request posted — the community can now reply ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not post", type: "error" });
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="page-content max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="type-h1">Community feed</h1>
        <p className="lead">Top students, open questions, and help from people who just solved them.</p>
      </header>

      {/* Quick access to social features */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { to: "/community", icon: "👥", label: "School Chat" },
          { to: "/games", icon: "♟️", label: "Games" },
          { to: "/legend", icon: "👑", label: "Legend" },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="glass-card p-3 text-center" style={{ textDecoration: "none", borderColor: "rgb(var(--primary-rgb) / 0.25)" }}>
            <div style={{ fontSize: 20 }}>{q.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginTop: 2 }}>{q.label}</div>
          </Link>
        ))}
      </div>

      {/* Top students */}
      <section>
        <h2 className="font-black text-text mb-3 flex items-center gap-2"><Trophy size={18} className="text-accent" /> Top students this week</h2>
        {top.length === 0 ? (
          <p className="text-sm text-text-muted">No public profiles yet — be the first! Turn on “Public profile” in Settings → Profile.</p>
        ) : (
          <div className="grid-auto">
            {top.map((s, i) => (
              <div key={s.uid} className="glass-card p-4 flex items-center gap-3">
                <span style={{ fontWeight: 900, color: "var(--text-muted)", width: 26 }}>#{i + 1}</span>
                <AvatarDisplay profile={s} user={{ displayName: s.name, photoURL: s.photoURL }} size={40} radius={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name || "Student"}
                    {(() => { const b = getActiveBadge(s); return b ? <span style={{ fontSize: 11, fontWeight: 800, color: b.color, marginLeft: 6 }}>{b.label}</span> : null; })()}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>⚡ {(s.xp || 0).toLocaleString()} XP</div>
                </div>
                <Link to={`/u/${s.uid}`} className="btn-secondary" style={{ padding: "8px 14px", fontSize: 12 }}>View</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Ask for help */}
      <section className="glass-card p-5" style={{ borderColor: "rgb(var(--primary-rgb) / 0.35)" }}>
        <h2 className="font-black text-text mb-3 flex items-center gap-2"><Sparkles size={17} className="text-primary" /> Stuck? Ask the community</h2>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field" style={{ maxWidth: 220 }}>
            {JAMB_SUBJECTS.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic (optional)" className="input-field flex-1" />
        </div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder='e.g. "I keep getting mole calculations wrong — how do you convert mass to moles?"'
          className="input-field" style={{ resize: "vertical", marginBottom: 10 }} />
        <button onClick={post} disabled={posting} className="btn-primary disabled:opacity-60">
          {posting ? "Posting…" : "Post help request"}
        </button>
      </section>

      {/* Student reviews */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-black text-text flex items-center gap-2"><Star size={18} className="text-accent" /> Student reviews</h2>
          <button onClick={() => setShowReviewForm((s) => !s)} className="btn-secondary px-4 text-sm">
            <PenLine size={14} /> Write a review
          </button>
        </div>
        {showReviewForm && (
          <div className="glass-card p-4 mb-3 space-y-3">
            <div className="flex gap-1 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setReviewRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={26} fill={n <= reviewRating ? "var(--accent)" : "none"} color={n <= reviewRating ? "var(--accent)" : "var(--border)"} />
                </button>
              ))}
            </div>
            <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={3} maxLength={500}
              placeholder="What do you think of ExamPadi? (shows with your name after admin approval)" className="input-field" style={{ resize: "vertical" }} />
            <button onClick={sendReview} disabled={sendingReview} className="btn-primary w-full disabled:opacity-60">
              {sendingReview ? "Sending…" : "Submit review"}
            </button>
          </div>
        )}
        {reviews.length === 0 ? (
          <p className="text-sm text-text-muted">No reviews yet — yours could be the first! 👆</p>
        ) : (
          <div className="grid-auto">
            {reviews.map((r) => {
              const liked = (r.likes || []).includes(user?.uid);
              return (
                <div key={r.id} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AvatarDisplay profile={{ name: r.name }} size={32} radius={16} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-text text-sm truncate">{r.name}</div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} size={11} fill={n <= (r.rating || 5) ? "var(--accent)" : "none"} color={n <= (r.rating || 5) ? "var(--accent)" : "var(--border)"} />
                        ))}
                      </div>
                    </div>
                    <button onClick={() => likeReview(r.id)} title={liked ? "Unlike" : "Like this review"}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer",
                        background: liked ? "rgb(var(--primary-rgb) / 0.14)" : "var(--bg-3)",
                        color: liked ? "var(--primary)" : "var(--text-muted)",
                        border: liked ? "1px solid var(--primary)" : "1px solid var(--border)",
                        borderRadius: 20, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                      }}>
                      <ThumbsUp size={13} /> {r.likeCount || 0}
                    </button>
                  </div>
                  <p className="text-sm text-text" style={{ lineHeight: 1.6 }}>{r.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Help board */}
      <section className="space-y-3">
        <h2 className="font-black text-text">Open questions ({requests.filter((r) => r.status !== "resolved").length})</h2>
        {requests.length === 0 && <p className="text-sm text-text-muted">Nothing here yet — post the first question above 👆</p>}
        {requests.map((r) => (
          <ReplyThread key={r.id} request={r} user={user} userName={user?.displayName || "Student"} />
        ))}
      </section>
    </div>
  );
}

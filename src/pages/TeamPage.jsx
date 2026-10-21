// src/pages/TeamPage.jsx — one community for a paid team/classroom:
// members, shared discussion thread, pinned insights, invite code.
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { getUserProfile } from "../lib/userProfile";
import {
  getTeam, sendTeamMessage, subscribeTeamMessages,
  pinInsight, listInsights,
} from "../lib/teams";
import { getQuestionsFromBank } from "../data/questions/compat";
import AvatarDisplay from "../components/Avatar/AvatarDisplay";
import {
  Share2, BookOpen, X, Pin, Users, Ticket, Crown,
} from "lucide-react";

export default function TeamPage() {
  const { teamId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [insights, setInsights] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareSubject, setShareSubject] = useState("Physics");
  const [shareQs, setShareQs] = useState([]);
  const [showPin, setShowPin] = useState(false);
  const [pinTitle, setPinTitle] = useState("");
  const [pinBody, setPinBody] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!teamId) return;
    getTeam(teamId).then(async (t) => {
      setTeam(t);
      const profiles = await Promise.all(
        (t.members || []).slice(0, 100).map((uid) =>
          getUserProfile(uid).then((p) => ({ uid, ...p })).catch(() => ({ uid, name: "Member" }))
        )
      );
      setMembers(profiles);
      listInsights(teamId).then(setInsights).catch(() => {});
    }).catch((e) => toast({ message: e.message, type: "error" }))
      .finally(() => setLoading(false));
    const unsub = subscribeTeamMessages(teamId, setMessages);
    return () => unsub && unsub();
  }, [teamId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isPayer = team && user && team.payerUid === user.uid;

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendTeamMessage(teamId, {
        fromUid: user.uid,
        fromName: user.displayName || "Student",
        text: input.trim(),
      });
      setInput("");
    } catch (e) {
      toast({ message: e.message || "Could not send", type: "error" });
    } finally {
      setSending(false);
    }
  }

  function loadShare() {
    const qs = getQuestionsFromBank({ subject: shareSubject, count: 5 });
    setShareQs(qs);
    if (qs.length === 0) toast({ message: "No questions found", type: "info" });
  }

  async function shareQuestion(q) {
    try {
      await sendTeamMessage(teamId, {
        fromUid: user.uid,
        fromName: user.displayName || "Student",
        text: "",
        question: {
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer || q.answer,
          explanation: q.explanation || "",
          subject: q.subject,
          topic: q.topic,
        },
      });
      setShowShare(false);
      toast({ message: "Shared with the team ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not share", type: "error" });
    }
  }

  async function handlePin() {
    try {
      await pinInsight(teamId, {
        title: pinTitle, body: pinBody,
        authorUid: user.uid, authorName: user.displayName || "Student",
      });
      setPinTitle("");
      setPinBody("");
      setShowPin(false);
      listInsights(teamId).then(setInsights).catch(() => {});
      toast({ message: "Insight pinned 📌", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not pin", type: "error" });
    }
  }

  if (loading) {
    return <div className="page-content"><p className="text-text-muted">Loading team…</p></div>;
  }
  if (!team) {
    return (
      <div className="page-content max-w-xl mx-auto text-center space-y-4">
        <h1 className="type-h1">Team not found</h1>
        <Link to="/payment" className="btn-secondary inline-flex px-5">Back to payment</Link>
      </div>
    );
  }

  return (
    <div className="page-content max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--landing-gradient)", color: "var(--text)" }}>
            <Users size={26} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-2xl font-black text-text flex items-center gap-2 flex-wrap">
              {team.name}
              {isPayer && <Crown size={18} className="text-accent" />}
            </h1>
            <p className="text-sm text-text-muted">
              {String(team.plan).includes("yearly") ? "Pro Yearly" : "Pro Monthly"} · {team.seatsUsed || 0}/{team.seats || 0} seats used
            </p>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2">
            <Ticket size={16} className="text-primary" />
            <span className="font-black font-mono tracking-widest text-primary">{team.code}</span>
          </div>
        </div>
        {/* Members */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
          {members.map((m) => (
            <div key={m.uid} title={m.name || "Member"} className="shrink-0">
              <AvatarDisplay profile={m} user={{ displayName: m.name, photoURL: m.photoURL }} size={36} radius={18} />
            </div>
          ))}
          {members.length === 0 && <span className="text-sm text-text-muted">No members yet — share the code above.</span>}
        </div>
      </div>

      {/* Pinned insights */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-text flex items-center gap-2"><Pin size={17} className="text-accent" /> Team insights</h2>
          {isPayer && (
            <button onClick={() => setShowPin((s) => !s)} className="btn-secondary px-4 text-sm">Pin insight</button>
          )}
        </div>
        {showPin && (
          <div className="glass-card p-4 mb-3 space-y-2">
            <input value={pinTitle} onChange={(e) => setPinTitle(e.target.value)} placeholder="Title — e.g. How we finally got vectors" className="input-field" />
            <textarea value={pinBody} onChange={(e) => setPinBody(e.target.value)} rows={3} placeholder="Share the method, trick, or summary…" className="input-field" style={{ resize: "vertical" }} />
            <button onClick={handlePin} className="btn-primary px-5 text-sm">Pin to team</button>
          </div>
        )}
        {insights.length === 0 ? (
          <p className="text-sm text-text-muted">No pinned insights yet. The payer can pin study tricks everyone sees first.</p>
        ) : (
          <div className="grid-auto">
            {insights.map((ins) => (
              <div key={ins.id} className="glass-card p-4">
                <div className="font-bold text-text text-sm mb-1">{ins.title || "Insight"}</div>
                <p className="text-sm text-text-muted whitespace-pre-wrap" style={{ lineHeight: 1.6 }}>{ins.body}</p>
                <div className="text-xs text-text-muted mt-2">— {ins.authorName}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Thread */}
      <section className="glass-card p-4 flex flex-col" style={{ minHeight: 380 }}>
        <h2 className="font-black text-text mb-3">Team discussion</h2>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12, maxHeight: 420 }}>
          {messages.length === 0 && (
            <p className="text-sm text-text-muted text-center mt-8">Kick things off — plan a study session or drop a tough question 👇</p>
          )}
          {messages.map((m) => {
            const mine = m.fromUid === user?.uid;
            return (
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "10px 14px", borderRadius: 14,
                  background: mine ? "var(--primary)" : "var(--bg-3)",
                  color: mine ? "#fff" : "var(--text)",
                  border: mine ? "none" : "1px solid var(--border)",
                }}>
                  {!mine && <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", marginBottom: 4 }}>{m.fromName}</div>}
                  {m.question ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.8, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                        <BookOpen size={12} /> {m.question.subject}{m.question.topic ? ` · ${m.question.topic}` : ""}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{m.question.question}</div>
                      {Object.entries(m.question.options || {}).map(([k, v]) => (
                        <div key={k} style={{
                          fontSize: 13, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
                          background: k === m.question.correctAnswer ? "rgba(74,222,128,0.18)" : "rgba(0,0,0,0.12)",
                          border: k === m.question.correctAnswer ? "1px solid var(--success)" : "1px solid transparent",
                        }}>
                          <strong>{k})</strong> {v} {k === m.question.correctAnswer ? "✓" : ""}
                        </div>
                      ))}
                      {m.question.explanation && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, fontStyle: "italic" }}>{m.question.explanation}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{m.text}</div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowShare((s) => !s); if (shareQs.length === 0) loadShare(); }} className="btn-secondary" style={{ padding: "12px 14px" }} title="Share a question">
            <Share2 size={16} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Message the team…" className="input-field flex-1" />
          <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary" style={{ padding: "12px 18px" }}>Send</button>
        </div>
        {showShare && (
          <div className="glass-card p-4 mt-3" style={{ borderColor: "rgb(var(--primary-rgb) / 0.4)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <input value={shareSubject} onChange={(e) => setShareSubject(e.target.value)} placeholder="Subject" className="input-field" style={{ maxWidth: 200 }} />
              <button onClick={loadShare} className="btn-secondary" style={{ padding: "10px 16px", fontSize: 13 }}>Load</button>
              <button onClick={() => setShowShare(false)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={16} /></button>
            </div>
            {shareQs.map((q, i) => (
              <button key={q.id || i} onClick={() => shareQuestion(q)} style={{
                display: "block", width: "100%", textAlign: "left", marginBottom: 8,
                background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10,
                padding: "10px 12px", color: "var(--text)", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
              }}>
                <strong>{q.subject}</strong> · {String(q.question).slice(0, 110)}{q.question.length > 110 ? "…" : ""}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

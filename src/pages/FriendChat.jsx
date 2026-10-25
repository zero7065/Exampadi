// 1:1 friend chat: text + shared question/solution cards.
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import PresenceBadge from "../components/PresenceBadge";
import { subscribePresenceForUids } from "../lib/presence";
import { getOrCreateThread, sendMessage, subscribeMessages } from "../lib/discussions";
import { getQuestionsFromBank } from "../data/questions/compat";
import { ArrowLeft, Send, Share2, BookOpen, X } from "lucide-react";

export default function FriendChat() {
  const { pairId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareSubject, setShareSubject] = useState("Physics");
  const [shareQs, setShareQs] = useState([]);
  const [presence, setPresence] = useState({});
  const bottomRef = useRef(null);
  const partnerUid = (pairId || "").split("_").find((uid) => uid && uid !== user?.uid) || "";

  useEffect(() => {
    if (!user || !pairId) return;
    getOrCreateThread(pairId, pairId.split("_")).catch(() => {});
    const unsub = subscribeMessages(pairId, setMessages);
    return () => unsub && unsub();
  }, [user, pairId]);

  useEffect(() => subscribePresenceForUids([partnerUid], setPresence), [partnerUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(pairId, {
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
    if (qs.length === 0) toast({ message: "No questions found for that subject", type: "info" });
  }

  async function shareQuestion(q) {
    try {
      await sendMessage(pairId, {
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
      toast({ message: "Question shared ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not share", type: "error" });
    }
  }

  return (
    <div className="page-content max-w-3xl mx-auto flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }}>
      <Link to="/study-partners" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-muted)", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
        <ArrowLeft size={16} /> Partners
      </Link>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h1 className="type-h2" style={{ margin: 0 }}>Friend discussion</h1>
        <PresenceBadge presence={presence[partnerUid]} />
      </div>

      <div className="glass-card p-4 flex-1 flex flex-col" style={{ minHeight: 380 }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
          {messages.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", marginTop: 40 }}>
              No messages yet. Say hi — or share a question to solve together 👇
            </p>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, opacity: 0.8, marginBottom: 6 }}>
                        <BookOpen size={12} /> {m.question.subject}{m.question.topic ? ` · ${m.question.topic}` : ""}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.5, marginBottom: 8 }}>{m.question.question}</div>
                      {Object.entries(m.question.options || {}).map(([k, v]) => (
                        <div key={k} style={{
                          fontSize: 13, padding: "6px 10px", borderRadius: 8, marginBottom: 4,
                          background: k === m.question.correctAnswer ? "rgba(74,222,128,0.18)" : "rgba(0,0,0,0.12)",
                          border: k === m.question.correctAnswer ? "1px solid var(--success)" : "1px solid transparent",
                        }}>
                          <strong>{k})</strong> {v} {k === m.question.correctAnswer ? "✓" : ""}
                        </div>
                      ))}
                      {m.question.explanation && (
                        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6, fontStyle: "italic" }}>{m.question.explanation}</div>
                      )}
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
          <button onClick={() => { setShowShare((s) => !s); if (shareQs.length === 0) loadShare(); }}
            title="Share a question" className="btn-secondary" style={{ padding: "12px 14px" }}>
            <Share2 size={16} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Discuss a problem…"
            className="input-field flex-1"
          />
          <button onClick={handleSend} disabled={sending || !input.trim()} className="btn-primary" style={{ padding: "12px 18px" }}>
            <Send size={16} />
          </button>
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
      </div>
    </div>
  );
}

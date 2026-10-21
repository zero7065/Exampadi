import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, MessageSquare, Send, Inbox, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import {
  listReviewRequestsForTeacher, getClassSubmission, subscribeReviewMessages,
  sendReviewMessage, updateReviewRequest,
} from "../../lib/classroom";

export default function ReviewInbox() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "Review Inbox — ExamPadi";
  }, []);

  useEffect(() => {
    if (!user) return;
    let live = true;
    listReviewRequestsForTeacher(user.uid)
      .then((rows) => { if (live) setRequests(rows); })
      .catch((e) => toast({ message: e.message || "Could not load reviews", type: "error" }))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [user, toast]);

  useEffect(() => {
    if (!selected) return;
    let live = true;
    getClassSubmission(selected.submissionId)
      .then((s) => { if (live) setSubmission(s); })
      .catch(() => { if (live) setSubmission(null); });
    return () => { live = false; };
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    return subscribeReviewMessages(selected.id, setMessages);
  }, [selected]);

  async function send() {
    const text = reply.trim();
    if (!text || !selected) return;
    setSending(true);
    try {
      await sendReviewMessage(selected.id, {
        fromUid: user.uid,
        fromName: profile?.displayName || user.displayName || "Teacher",
        text,
      });
      setReply("");
    } catch (e) {
      toast({ message: e.message || "Message failed", type: "error" });
    } finally {
      setSending(false);
    }
  }

  async function resolve() {
    if (!selected) return;
    try {
      await updateReviewRequest(selected.id, { status: "resolved" });
      setRequests((rows) => rows.map((r) => (r.id === selected.id ? { ...r, status: "resolved" } : r)));
      setSelected((s) => ({ ...s, status: "resolved" }));
      toast({ message: "Marked as resolved ✓", type: "success" });
    } catch (e) {
      toast({ message: e.message || "Could not update", type: "error" });
    }
  }

  return (
    <div className="page-content" style={{ paddingTop: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <Link to="/teacher" className="p-2 rounded-lg hover:bg-subtle" aria-label="Back to teacher dashboard">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>Review inbox</h1>
          <p style={{ color: "var(--text-muted)", margin: "3px 0 0", fontSize: 13 }}>
            Student whiteboard work sent to you for feedback.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 16, alignItems: "start" }} className="review-grid">
        <div className="glass-card" style={{ padding: 10, maxHeight: "70vh", overflowY: "auto" }}>
          {loading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: 16, color: "var(--text-muted)", fontSize: 13 }}>
              <Loader2 size={16} className="animate-spin" /> Loading…
            </div>
          ) : requests.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              <Inbox size={26} style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13 }}>No review requests yet.</div>
            </div>
          ) : requests.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                width: "100%", textAlign: "left", padding: "10px 11px", borderRadius: 9,
                border: "1px solid transparent", cursor: "pointer", fontFamily: "inherit",
                background: selected?.id === r.id ? "rgb(var(--primary-rgb) / 0.12)" : "transparent",
                borderColor: selected?.id === r.id ? "rgb(var(--primary-rgb) / 0.35)" : "transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{r.studentName || "Student"}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: r.status === "resolved" ? "var(--success)" : "var(--warning)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {r.status === "resolved" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                  {r.status || "pending"}
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.message || "Please review my working."}
              </div>
            </button>
          ))}
        </div>

        <div className="glass-card" style={{ padding: 18, minHeight: 320 }}>
          {!selected ? (
            <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "70px 20px" }}>
              <MessageSquare size={30} style={{ margin: "0 auto 10px" }} />
              <div style={{ fontSize: 14 }}>Select a request to review the work.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 900 }}>{selected.studentName || "Student"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {selected.classId ? "Class submission" : "Direct review"} · Question {selected.questionId || "—"}
                  </div>
                </div>
                {selected.status !== "resolved" && (
                  <button onClick={resolve} className="btn-secondary" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <CheckCircle2 size={14} /> Mark resolved
                  </button>
                )}
              </div>

              {selected.message && (
                <p style={{ margin: "12px 0", padding: "9px 11px", borderRadius: 8, background: "var(--bg-2)", border: "1px solid var(--border)", fontSize: 13, color: "var(--text)" }}>
                  “{selected.message}”
                </p>
              )}

              {submission ? (
                <div style={{ margin: "12px 0" }}>
                  {submission.thumbnail ? (
                    <img src={submission.thumbnail} alt="Student whiteboard working" style={{ width: "100%", maxHeight: 330, objectFit: "contain", borderRadius: 10, border: "1px solid var(--border)", background: "#fff" }} />
                  ) : (
                    <div style={{ padding: 14, borderRadius: 10, border: "1px dashed var(--border)", color: "var(--text-muted)", fontSize: 12 }}>
                      No drawing attached.
                    </div>
                  )}
                  {submission.text && (
                    <p style={{ fontSize: 13, lineHeight: 1.6, margin: "9px 0 0", color: "var(--text)" }}>{submission.text}</p>
                  )}
                </div>
              ) : (
                <div style={{ margin: "12px 0", padding: 12, borderRadius: 8, background: "var(--bg-2)", fontSize: 12, color: "var(--text-muted)" }}>
                  Submission details unavailable.
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Conversation
                </div>
                <div style={{ maxHeight: 220, overflowY: "auto", display: "grid", gap: 7 }}>
                  {messages.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No messages yet.</div>
                  ) : messages.map((m) => (
                    <div key={m.id} style={{
                      justifySelf: m.fromUid === user.uid ? "end" : "start", maxWidth: "82%",
                      padding: "7px 10px", borderRadius: 9, fontSize: 12.5, lineHeight: 1.5,
                      background: m.fromUid === user.uid ? "rgb(var(--primary-rgb) / 0.15)" : "var(--bg-2)",
                      border: "1px solid var(--border)", color: "var(--text)",
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)", marginBottom: 2 }}>{m.fromName || "User"}</div>
                      {m.text}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                    placeholder="Write feedback…"
                    style={{ flex: 1, padding: "9px 11px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--bg-2)", color: "var(--text)", fontFamily: "inherit", fontSize: 13 }}
                  />
                  <button onClick={send} disabled={sending || !reply.trim()} className="btn-primary" style={{ padding: "9px 13px", opacity: sending || !reply.trim() ? 0.5 : 1 }}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`@media (max-width: 780px) { .review-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

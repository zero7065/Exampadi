// Survey prompt: appears once, ~1 week after account creation.
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { getActiveSurvey, hasVotedSurvey, submitSurveyVote } from "../lib/community";
import { X, BarChart3 } from "lucide-react";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function surveyDue(createdAt, uid) {
  try {
    if (localStorage.getItem(`survey-done-${uid}`)) return false;
    if (!createdAt) return false;
    const t = createdAt?.toDate ? createdAt.toDate().getTime() : new Date(createdAt).getTime();
    return Date.now() - t >= WEEK_MS;
  } catch {
    return false;
  }
}

export default function SurveyPrompt({ createdAt }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [survey, setSurvey] = useState(null);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // Wait for auth to complete before checking survey
    if (authLoading || !user || !surveyDue(createdAt, user.uid)) return;
    
    getActiveSurvey().then(async (s) => {
      if (!s) return;
      const voted = await hasVotedSurvey(s.id, user.uid).catch(() => false);
      if (!voted) {
        setSurvey(s);
        setOpen(true);
      } else {
        try { localStorage.setItem(`survey-done-${user.uid}`, "1"); } catch { /* private mode */ }
      }
    }).catch(() => {});
  }, [user, createdAt, authLoading]);

  if (!open || !survey) return null;

  function dismiss(permanent = true) {
    if (permanent) {
      try { localStorage.setItem(`survey-done-${user.uid}`, "1"); } catch { /* private mode */ }
    }
    setOpen(false);
  }

  async function vote() {
    if (picked === null) {
      toast({ message: "Pick an option first", type: "info" });
      return;
    }
    if (!user) {
      toast({ message: "Please sign in to vote", type: "warning" });
      return;
    }
    setSending(true);
    try {
      await submitSurveyVote(survey.id, user.uid, picked);
      toast({ message: "Vote counted — thank you! 🗳️", type: "success" });
      dismiss(true);
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        toast({ message: "Permission denied. Please sign in again and try.", type: "error" });
      } else {
        toast({ message: e.message || "Could not vote", type: "error" });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(false); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
      <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 440, padding: 24, animation: "slideUp 0.3s ease-out" }}>
        <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-black text-text flex items-center gap-2"><BarChart3 size={18} className="text-primary" /> Quick survey</h3>
          <button onClick={() => dismiss(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><X size={18} /></button>
        </div>
        <p className="text-sm text-text mb-4" style={{ lineHeight: 1.6 }}>{survey.question}</p>
        <div className="space-y-2 mb-4">
          {survey.options.map((o, i) => (
            <button key={i} onClick={() => setPicked(i)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12,
              cursor: "pointer", fontSize: 14, fontFamily: "inherit", transition: "all 0.2s ease",
              background: picked === i ? "rgb(var(--primary-rgb) / 0.16)" : "var(--bg-3)",
              border: picked === i ? "2px solid var(--primary)" : "1px solid var(--border)",
              color: "var(--text)", fontWeight: picked === i ? 700 : 400,
            }}>{o}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={vote} disabled={sending} className="btn-primary flex-1 disabled:opacity-60">
            {sending ? "Voting…" : "Vote"}
          </button>
          <button onClick={() => dismiss(true)} className="btn-secondary px-5">Later</button>
        </div>
      </div>
    </div>
  );
}

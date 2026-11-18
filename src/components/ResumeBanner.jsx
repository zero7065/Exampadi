import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Play, X } from "lucide-react";

export default function ResumeBanner() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("exampadi_active_session");
      if (raw) {
        const s = JSON.parse(raw);
        const age = Date.now() - (s.startTime || 0);
        if (age < 24 * 60 * 60 * 1000 && s.questions?.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the resumable session once on mount
          setSession(s);
        } else {
          localStorage.removeItem("exampadi_active_session");
        }
      }
    } catch { /* ignore unreadable session */ }
  }, []);

  if (!session) return null;

  const answered = session.answers?.filter(Boolean).length || 0;
  const total = session.questions?.length || 0;
  const subject = session.subjects?.[0]?.name || session.subject || "Practice";

  return (
    <div style={{
      background: "linear-gradient(135deg, rgb(var(--primary-rgb) / 0.15), rgb(var(--accent-rgb) / 0.08))",
      border: "1px solid rgb(var(--primary-rgb) / 0.3)",
      borderRadius: 16,
      padding: "16px 20px",
      marginBottom: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: "rgb(var(--primary-rgb) / 0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Play size={18} color="var(--primary)" fill="var(--primary)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Resume {subject}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {answered}/{total} answered · started{" "}
            {session.startTime ? formatAgo(session.startTime) : "today"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => { localStorage.removeItem("exampadi_active_session"); setSession(null); }}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
        <button
          onClick={() => navigate("/practice", { state: session })}
          style={{
            padding: "10px 20px", borderRadius: 10, background: "var(--primary)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          Resume
        </button>
      </div>
    </div>
  );
}

function formatAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

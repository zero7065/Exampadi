import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Play, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loadActiveSession, clearActiveSession } from "../lib/activeSession";

const SESSION_ROUTES = ["/practice", "/cbt", "/mock-exam"];

// App-wide banner offering to continue a paused practice / CBT / mock session.
export default function ResumeBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [session, setSession] = useState(null);

  // Re-read on mount (the banner is conditionally mounted per-route by App),
  // so a just-paused session shows up as soon as the user lands elsewhere.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate resumable session once on mount
  useEffect(() => { setSession(loadActiveSession()); }, []);

  if (!user || !session) return null;
  if (SESSION_ROUTES.includes(location.pathname)) return null;

  const answered = Object.values(session.answers || {}).filter(Boolean).length;
  const total = session.questions?.length || 0;
  const subject = session.subjects?.[0]?.name || session.subject || session.exam || "Practice";
  const label = session.route === "/cbt" ? "CBT" : session.route === "/mock-exam" ? "Mock exam" : "Practice";

  return (
    <div style={{
      background: "linear-gradient(135deg, rgb(var(--primary-rgb) / 0.15), rgb(var(--accent-rgb) / 0.08))",
      border: "1px solid rgb(var(--primary-rgb) / 0.3)",
      borderRadius: 16,
      padding: "16px 20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: "rgb(var(--primary-rgb) / 0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Play size={18} color="var(--primary)" fill="var(--primary)" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            Continue {label} · {subject}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {answered}/{total} answered · paused {session.startTime ? formatAgo(session.savedAt || session.startTime) : "today"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <button
          onClick={() => { clearActiveSession(); setSession(null); }}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
          aria-label="Discard saved session"
          title="Start fresh (discard)"
        >
          <X size={18} />
        </button>
        <button
          onClick={() => navigate(session.route || "/practice", { state: session })}
          style={{
            padding: "10px 20px", borderRadius: 10, background: "var(--primary)",
            border: "none", color: "#fff", fontWeight: 700, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function formatAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

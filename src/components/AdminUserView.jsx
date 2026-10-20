import { useState, useEffect } from "react";
import { Eye, Crown, Ban, RefreshCw, Loader2 } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getUserProfile } from "../lib/userProfile";

export default function AdminUserView({ userId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const prof = await getUserProfile(userId);
        setProfile(prof);
        const { collection, query, where, getDocs, limit } = await import("firebase/firestore");
        const snap = await getDocs(query(collection(db, "sessions"), where("userId", "==", userId), limit(10)));
        setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to load user:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  async function grantPro() {
    setActing(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        "subscription.status": "active",
        plan: "pro",
        planExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        proFeatures: { unlimitedQuestions: true, unlimitedAI: true, mockExams: true, allSubjects: true },
      });
      setProfile({ ...profile, plan: "pro", "subscription.status": "active" });
    } catch (e) {
      console.error("Failed to grant Pro:", e);
    } finally {
      setActing(false);
    }
  }

  async function revokePro() {
    setActing(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        "subscription.status": "revoked",
        plan: null,
        planExpiry: null,
      });
      setProfile({ ...profile, plan: null, "subscription.status": "revoked" });
    } catch (e) {
      console.error("Failed to revoke Pro:", e);
    } finally {
      setActing(false);
    }
  }

  async function resetProgress() {
    if (!window.confirm("Reset all progress for this user?")) return;
    setActing(true);
    try {
      await updateDoc(doc(db, "users", userId), {
        totalXP: 0,
        streak: 0,
        totalQuestions: 0,
        stats: {},
      });
      setProfile({ ...profile, totalXP: 0, streak: 0, totalQuestions: 0 });
    } catch (e) {
      console.error("Failed to reset:", e);
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
        <Loader2 size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div className="glass-card" style={{ position: "relative", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", fontSize: 18, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={20} color="var(--primary)" /> Viewing as {profile?.name || "User"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-3)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4 }}>Email</div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile?.email || "—"}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-3)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4 }}>Plan</div>
            <div style={{ color: profile?.plan === "pro" ? "#4ADE80" : "var(--text-muted)", fontSize: 13, fontWeight: 600 }}>{profile?.plan === "pro" ? "Pro" : "Free"}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-3)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4 }}>XP</div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile?.totalXP || 0}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-3)" }}>
            <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 4 }}>Streak</div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{profile?.streak || 0} days</div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Recent Sessions</div>
          {sessions.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No sessions yet</div>
          ) : (
            sessions.slice(0, 5).map((s) => (
              <div key={s.id} style={{ padding: 10, borderRadius: 8, background: "var(--bg-3)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text)", fontSize: 13 }}>{s.subject || "Practice"}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{s.correct || 0}/{s.total || 0} correct</span>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={grantPro} disabled={acting} style={{ padding: "10px 16px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Crown size={14} /> Grant Pro
          </button>
          <button onClick={revokePro} disabled={acting} style={{ padding: "10px 16px", borderRadius: 8, background: "#ef4444", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Ban size={14} /> Revoke Pro
          </button>
          <button onClick={resetProgress} disabled={acting} style={{ padding: "10px 16px", borderRadius: 8, background: "var(--border)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={14} /> Reset Progress
          </button>
        </div>
      </div>
    </div>
  );
}

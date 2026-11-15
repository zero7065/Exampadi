import { useState, useEffect } from "react";
import { BarChart3, Users, Activity, CreditCard, TrendingUp, Download, Loader2 } from "lucide-react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const sessionsSnap = await getDocs(query(collection(db, "sessions"), limit(500)));
        const paymentsSnap = await getDocs(query(collection(db, "activityLog"), where("action", "==", "payment"), limit(100)));
        const aiSnap = await getDocs(query(collection(db, "aiTrainingData"), limit(100)));

        const users = usersSnap.docs.map((d) => d.data());
        const sessions = sessionsSnap.docs.map((d) => d.data());
        const payments = paymentsSnap.docs.map((d) => d.data());
        const aiEntries = aiSnap.docs.map((d) => d.data());
        const patternSnap = await getDocs(query(collection(db, "learningPatterns"), limit(100)));
        const patterns = patternSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        const totalXP = users.reduce((sum, u) => sum + (u.totalXP || 0), 0);
        const proUsers = users.filter((u) => u.plan === "pro" || u.subscription?.status === "active").length;
        const totalQuestions = sessions.reduce((sum, s) => sum + (s.totalQuestions || s.total || 0), 0);
        const totalRevenue = payments.reduce((sum, p) => sum + (p.details?.amount || 0), 0);

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const daySessions = sessions.filter((s) => {
            const sd = s.createdAt?.toDate?.() || (s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : null);
            return sd && sd.toISOString().slice(0, 10) === key;
          });
          last7Days.push({
            date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
            sessions: daySessions.length,
            questions: daySessions.reduce((sum, s) => sum + (s.totalQuestions || s.total || 0), 0),
          });
        }

        setData({
          totalUsers: users.length,
          proUsers,
          totalSessions: sessions.length,
          totalQuestions,
          totalXP,
          totalRevenue,
          aiInteractions: aiEntries.length,
          last7Days,
          avgScore: sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + (s.percentageScore || s.score || 0), 0) / sessions.length) : 0,
          patterns,
        });
      } catch (e) {
        console.error("Failed to load analytics:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function downloadCSV() {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Users", data.totalUsers],
      ["Pro Users", data.proUsers],
      ["Total Sessions", data.totalSessions],
      ["Total Questions", data.totalQuestions],
      ["Total XP", data.totalXP],
      ["Total Revenue (NGN)", data.totalRevenue],
      ["AI Interactions", data.aiInteractions],
      ["Avg Score", data.avgScore + "%"],
      [],
      ["Date", "Sessions", "Questions"],
      ...data.last7Days.map((d) => [d.date, d.sessions, d.questions]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: 24 }}><Loader2 className="animate-spin" /> Loading analytics...</div>;
  }

  if (!data) {
    return <div style={{ color: "var(--text-muted)", padding: 24 }}>Failed to load analytics.</div>;
  }

  const maxSessions = Math.max(...data.last7Days.map((d) => d.sessions), 1);

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BarChart3 size={18} color="var(--primary)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Analytics Dashboard</span>
        </div>
        <button onClick={downloadCSV} style={{ padding: "8px 16px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { icon: Users, label: "Total Users", value: data.totalUsers, color: "var(--primary)" },
          { icon: CreditCard, label: "Pro Users", value: data.proUsers, color: "#4ADE80" },
          { icon: Activity, label: "Sessions", value: data.totalSessions, color: "var(--accent)" },
          { icon: TrendingUp, label: "Questions", value: data.totalQuestions, color: "#FF9F43" },
          { icon: BarChart3, label: "AI Chats", value: data.aiInteractions, color: "var(--primary)" },
          { icon: TrendingUp, label: "Avg Score", value: data.avgScore + "%", color: "#4ADE80" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "var(--bg-3)", borderRadius: 12, padding: 14, textAlign: "center" }}>
              <Icon size={20} color={s.color} style={{ margin: "0 auto 6px" }} />
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Sessions (Last 7 Days)</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {data.last7Days.map((d) => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", maxWidth: 40, height: Math.max(4, (d.sessions / maxSessions) * 80), background: "linear-gradient(180deg, var(--primary), var(--accent))", borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Patterns — real data collected as students practice */}
      {data.patterns && data.patterns.length > 0 && (
        <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
            Learning Patterns — {data.patterns.length} tracked student{data.patterns.length === 1 ? "" : "s"}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {data.patterns.slice(0, 15).map((p) => (
              <div key={p.id} style={{ background: "var(--bg-2)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="text-xs font-bold" style={{ color: "var(--primary)" }}>{p.id.slice(0, 8)}</span>
                <span className="text-xs text-text-muted">Avg: {p.avgPct ?? 0}%</span>
                <span className="text-xs text-text-muted">{p.totalSessions ?? 0} sessions</span>
                <span className="text-xs text-text-muted">Best hour: {p.bestStudyHour || "—"}</span>
                {p.avgPct >= 80 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.15)", color: "#4ADE80" }}>TOP</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

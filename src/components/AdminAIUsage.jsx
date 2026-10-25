// Admin AI Usage Dashboard — Real-time AI credit monitoring & cost control
import { useState, useEffect } from "react";
import {
  Zap, AlertTriangle, TrendingUp, Download, Loader2, DollarSign,
  MessageSquare, BarChart3, ShieldCheck, Bell
} from "lucide-react";
import { collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { apiUrl } from "../lib/apiBase";

const AI_COST_PER_1K_TOKENS = 0.00015; // Groq pricing estimate
const MONTHLY_BUDGET_USD = 200; // Adjust based on your budget
const ALERT_THRESHOLD_PCT = 20; // Alert when < 20% remaining

function formatNumber(n) {
  return new Intl.NumberFormat().format(Math.round(n));
}

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

export default function AdminAIUsage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("7d");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const cutoff = new Date();
        if (timeRange === "1d") cutoff.setDate(cutoff.getDate() - 1);
        else if (timeRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
        else if (timeRange === "30d") cutoff.setDate(cutoff.getDate() - 30);

        const logsQuery = timeRange === "all"
          ? query(collection(db, "aiUsageLog"), orderBy("createdAt", "desc"), limit(1000))
          : query(collection(db, "aiUsageLog"), where("createdAt", ">=", cutoff), orderBy("createdAt", "desc"), limit(1000));

        const [logsSnap, usersSnap] = await Promise.all([
          getDocs(logsQuery),
          getDocs(collection(db, "users")),
        ]);

        const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Aggregate stats
        const totalMessages = logs.length;
        const totalTokens = logs.reduce((sum, l) => sum + (l.tokens || 0), 0);
        const estimatedCost = totalTokens / 1000 * AI_COST_PER_1K_TOKENS;
        const budgetUsedPct = (estimatedCost / MONTHLY_BUDGET_USD) * 100;
        const remainingBudget = Math.max(0, MONTHLY_BUDGET_USD - estimatedCost);
        const remainingPct = Math.max(0, 100 - budgetUsedPct);

        // By model
        const byModel = {};
        logs.forEach(l => {
          const m = l.model || "unknown";
          byModel[m] = (byModel[m] || 0) + 1;
        });

        // By source/feature
        const bySource = {};
        logs.forEach(l => {
          const s = l.source || "unknown";
          bySource[s] = (bySource[s] || 0) + 1;
        });

        // By user (top 20)
        const byUser = {};
        logs.forEach(l => {
          const uid = l.userId;
          if (!byUser[uid]) byUser[uid] = { messages: 0, tokens: 0, cost: 0, lastActive: null };
          byUser[uid].messages++;
          byUser[uid].tokens += l.tokens || 0;
          byUser[uid].cost += (l.tokens || 0) / 1000 * AI_COST_PER_1K_TOKENS;
          const ts = l.createdAt?.toDate?.() || (l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : null);
          if (ts && (!byUser[uid].lastActive || ts > byUser[uid].lastActive)) {
            byUser[uid].lastActive = ts;
          }
        });

        // Add user details
        const topUsers = Object.entries(byUser)
          .map(([uid, stats]) => {
            const user = users.find(u => u.id === uid);
            return { uid, ...stats, name: user?.name || "—", email: user?.email || "—" };
          })
          .sort((a, b) => b.messages - a.messages)
          .slice(0, 20);

        // Daily breakdown
        const dailyMap = {};
        logs.forEach(l => {
          const ts = l.createdAt?.toDate?.() || (l.createdAt?.seconds ? new Date(l.createdAt.seconds * 1000) : null);
          if (!ts) return;
          const key = ts.toISOString().slice(0, 10);
          if (!dailyMap[key]) dailyMap[key] = { messages: 0, tokens: 0, cost: 0 };
          dailyMap[key].messages++;
          dailyMap[key].tokens += l.tokens || 0;
          dailyMap[key].cost += (l.tokens || 0) / 1000 * AI_COST_PER_1K_TOKENS;
        });

        const dailyData = Object.entries(dailyMap)
          .map(([date, stats]) => ({ date, ...stats }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setData({
          totalMessages,
          totalTokens,
          estimatedCost,
          budgetUsedPct,
          remainingBudget,
          remainingPct,
          byModel,
          bySource,
          topUsers,
          dailyData,
          isAlert: remainingPct < ALERT_THRESHOLD_PCT,
        });
      } catch (e) {
        console.error("Failed to load AI usage:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [timeRange]);

  function downloadCSV() {
    if (!data) return;
    const rows = [
      ["AI Usage Report", new Date().toISOString().slice(0, 10)],
      ["Metric", "Value"],
      ["Total AI Messages", data.totalMessages],
      ["Total Tokens", formatNumber(data.totalTokens)],
      ["Estimated Cost", formatCurrency(data.estimatedCost)],
      ["Monthly Budget", formatCurrency(MONTHLY_BUDGET_USD)],
      ["Budget Used", `${data.budgetUsedPct.toFixed(1)}%`],
      ["Remaining Budget", formatCurrency(data.remainingBudget)],
      ["Remaining %", `${data.remainingPct.toFixed(1)}%`],
      [],
      ["Model", "Messages"],
      ...Object.entries(data.byModel).map(([model, count]) => [model, count]),
      [],
      ["Feature", "Messages"],
      ...Object.entries(data.bySource).map(([source, count]) => [source, count]),
      [],
      ["Top Users", "", "Messages", "Tokens", "Cost", "Last Active"],
      ...data.topUsers.map(u => [u.name || u.email, u.uid, u.messages, formatNumber(u.tokens), formatCurrency(u.cost), u.lastActive?.toLocaleString() || "—"]),
      [],
      ["Daily Breakdown", "Messages", "Tokens", "Cost"],
      ...data.dailyData.map(d => [d.date, d.messages, formatNumber(d.tokens), formatCurrency(d.cost)]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-ai-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportLogs() {
    if (!auth?.currentUser) {
      setExportError("Sign in again to export AI logs.");
      return;
    }
    setExporting(true);
    setExportError("");
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(apiUrl("/api/export/ai-logs?scope=all&limit=5000&format=jsonl"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-logs-${new Date().toISOString().slice(0, 10)}.jsonl`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error?.message || "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)", padding: 24, display: "flex", alignItems: "center", gap: 12 }}><Loader2 className="animate-spin" size={20} /> Loading AI usage...</div>;
  }

  if (!data) {
    return <div style={{ color: "var(--text-muted)", padding: 24 }}>Failed to load AI usage.</div>;
  }

  const maxDaily = Math.max(...data.dailyData.map(d => d.messages), 1);

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header with Alert */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Zap size={18} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>AI Usage Dashboard</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {["1d", "7d", "30d", "all"].map(r => (
            <button key={r} onClick={() => setTimeRange(r)} style={{
              padding: "6px 12px", borderRadius: 8, border: "none",
              background: timeRange === r ? "var(--primary)" : "var(--bg-3)",
              color: timeRange === r ? "#fff" : "var(--text-muted)",
              fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            }}>{r === "1d" ? "24h" : r === "7d" ? "7d" : r === "30d" ? "30d" : "All"}</button>
          ))}
          <button onClick={downloadCSV} style={{ padding: "8px 16px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <Download size={14} /> Export CSV
          </button>
          <button onClick={exportLogs} disabled={exporting} style={{ padding: "8px 16px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 12, cursor: exporting ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: exporting ? 0.7 : 1 }}>
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export AI Logs
          </button>
        </div>
      </div>
      {exportError && <div style={{ color: "#f87171", fontSize: 12 }}>{exportError}</div>}

      {/* Alert Banner */}
      {data.isAlert && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px", borderRadius: 12, background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)" }}>
          <AlertTriangle size={20} color="#f87171" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#f87171", fontSize: 14 }}>⚠️ AI Budget Alert</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              Remaining budget: <strong>{formatCurrency(data.remainingBudget)}</strong> ({data.remainingPct.toFixed(1)}% left).
              Consider topping up Groq credits or reviewing usage patterns.
            </div>
          </div>
          <Bell size={20} color="#f87171" className="animate-pulse" />
        </div>
      )}

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
        {[
          { icon: MessageSquare, label: "AI Messages", value: formatNumber(data.totalMessages), color: "var(--primary)" },
          { icon: BarChart3, label: "Total Tokens", value: formatNumber(data.totalTokens), color: "#4ADE80" },
          { icon: DollarSign, label: "Est. Cost", value: formatCurrency(data.estimatedCost), color: "#fbbf24" },
          { icon: TrendingUp, label: "Budget Used", value: `${data.budgetUsedPct.toFixed(1)}%`, color: data.isAlert ? "#f87171" : "#4ADE80" },
          { icon: ShieldCheck, label: "Remaining", value: formatCurrency(data.remainingBudget), color: "#4ADE80" },
          { icon: Bell, label: "Threshold", value: `${ALERT_THRESHOLD_PCT}%`, color: "var(--accent)" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <Icon size={20} color={s.color} style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Budget Progress Bar */}
      <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
            Monthly Budget: {formatCurrency(data.estimatedCost)} / {formatCurrency(MONTHLY_BUDGET_USD)}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: data.isAlert ? "#f87171" : "#4ADE80" }}>
            {data.remainingPct.toFixed(1)}% Remaining
          </span>
        </div>
        <div style={{ height: 12, background: "var(--border)", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            width: `${Math.max(0, 100 - data.budgetUsedPct)}%`,
            height: "100%",
            background: data.isAlert ? "linear-gradient(90deg, #f87171, #fbbf24)" : "linear-gradient(90deg, #10b981, #34d399)",
            borderRadius: 6,
            transition: "width 0.5s ease",
          }} />
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* By Model */}
        <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            By Model
          </div>
          {Object.entries(data.byModel).length === 0 ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No data</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(data.byModel)
                .sort(([,a], [,b]) => b - a)
                .map(([model, count]) => (
                  <div key={model} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{model}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(count / Math.max(...Object.values(data.byModel))) * 100}%`, height: "100%", background: "var(--primary)", borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 50, textAlign: "right" }}>{formatNumber(count)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* By Feature/Source */}
        <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            By Feature
          </div>
          {Object.entries(data.bySource).length === 0 ? (
            <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 20 }}>No data</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Object.entries(data.bySource)
                .sort(([,a], [,b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", minWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{source}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${(count / Math.max(...Object.values(data.bySource))) * 100}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, minWidth: 50, textAlign: "right" }}>{formatNumber(count)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Trend */}
      <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Daily Trend (Messages)
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
          {data.dailyData.map((d) => (
            <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{ width: "100%", maxWidth: 40, height: Math.max(4, (d.messages / maxDaily) * 100), background: "linear-gradient(180deg, var(--primary), var(--accent))", borderRadius: "4px 4px 0 0", transition: "height 0.3s" }} />
              <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Users Table */}
      <div style={{ background: "var(--bg-3)", borderRadius: 12, padding: 16, overflowX: "auto" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
          Top Users by AI Messages
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["User", "Email", "Messages", "Tokens", "Est. Cost", "Last Active"].map(h => (
                <th key={h} style={{ padding: "10px 8px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.topUsers.map((u) => (
              <tr key={u.uid} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 8px", color: "#fff", fontWeight: 600 }}>{u.name || "—"}</td>
                <td style={{ padding: "10px 8px", color: "var(--text-muted)", fontSize: 11 }}>{u.email}</td>
                <td style={{ padding: "10px 8px", color: "var(--primary)", fontWeight: 700 }}>{formatNumber(u.messages)}</td>
                <td style={{ padding: "10px 8px", color: "var(--text)" }}>{formatNumber(u.tokens)}</td>
                <td style={{ padding: "10px 8px", color: "#fbbf24", fontWeight: 600 }}>{formatCurrency(u.cost)}</td>
                <td style={{ padding: "10px 8px", color: "var(--text-muted)", fontSize: 10 }}>{u.lastActive?.toLocaleString() || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
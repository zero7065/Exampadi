import { useState } from "react";
import { Download, Loader2, Database } from "lucide-react";
import { getTrainingEntries, formatTrainingEntryForFinetuning } from "../lib/aiTraining";

export default function AdminTrainingData() {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState({ userId: "", type: "", since: "", until: "" });

  async function load() {
    setLoading(true);
    try {
      const data = await getTrainingEntries({
        userId: filter.userId || undefined,
        type: filter.type || undefined,
        since: filter.since || undefined,
        until: filter.until || undefined,
        limitCount: 500,
      });
      setEntries(data);
    } catch (e) {
      console.error("Failed to load training data:", e);
    } finally {
      setLoading(false);
    }
  }

  function downloadJSON() {
    const formatted = entries.map(formatTrainingEntryForFinetuning);
    const blob = new Blob([JSON.stringify(formatted, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-training-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadCSV() {
    const headers = ["type", "userId", "userEmail", "createdAt", "messageCount", "metadata"];
    const rows = entries.map((e) => [
      e.type,
      e.userId,
      e.userEmail,
      e.createdAt,
      e.messages?.length || 0,
      JSON.stringify(e.metadata || {}),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-training-data-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Database size={18} color="var(--primary)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>AI Training Data Export</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <input placeholder="User ID (optional)" value={filter.userId} onChange={(e) => setFilter({ ...filter, userId: e.target.value })} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }} />
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }}>
          <option value="">All types</option>
          <option value="chatWithTutor">Chat</option>
          <option value="explainAnswer">Explain Answer</option>
          <option value="explainQuestion">Explain Question</option>
          <option value="askGroq">Ask Groq</option>
        </select>
        <input type="date" value={filter.since} onChange={(e) => setFilter({ ...filter, since: e.target.value })} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }} />
        <input type="date" value={filter.until} onChange={(e) => setFilter({ ...filter, until: e.target.value })} style={{ padding: "10px 14px", borderRadius: 8, background: "var(--bg-3)", border: "1px solid #333", color: "var(--text)", fontSize: 13, outline: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={load} disabled={loading} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} Load Data
        </button>
        <button onClick={downloadJSON} disabled={entries.length === 0} style={{ padding: "10px 20px", borderRadius: 8, background: entries.length > 0 ? "#4ADE80" : "var(--border)", border: "none", color: entries.length > 0 ? "#000" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: entries.length > 0 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
          <Download size={16} /> JSON
        </button>
        <button onClick={downloadCSV} disabled={entries.length === 0} style={{ padding: "10px 20px", borderRadius: 8, background: entries.length > 0 ? "var(--accent)" : "var(--border)", border: "none", color: entries.length > 0 ? "#000" : "var(--text-muted)", fontWeight: 700, fontSize: 13, cursor: entries.length > 0 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 8 }}>
          <Download size={16} /> CSV
        </button>
      </div>

      {entries.length > 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {entries.length} entries loaded. JSON format is ready for finetuning.
        </div>
      )}
    </div>
  );
}

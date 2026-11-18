import { useState } from "react";
import { Download, FileText, MessageCircle } from "lucide-react";
import { shareToWhatsApp } from "../../lib/share";

export default function TeacherDataExport({ roster, schoolName }) {
  const [exporting] = useState(false);

  function generateCSV() {
    const headers = ["Name", "XP", "Streak", "Topics Attempted", "Accuracy %"];
    const rows = roster.map((r) => {
      const topics = Object.entries(r.topics);
      const totalAttempts = topics.reduce((sum, [, v]) => sum + v.t, 0);
      const totalCorrect = topics.reduce((sum, [, v]) => sum + v.c, 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      return [r.name, r.xp, r.streak, topics.length, accuracy];
    });
    return [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  function generateTextReport() {
    const lines = [
      `ExamPadi Teacher Report — ${schoolName}`,
      `Generated: ${new Date().toLocaleDateString()}`,
      `Students: ${roster.length}`,
      "",
      "--- Student Performance ---",
    ];
    roster.forEach((r) => {
      const topics = Object.entries(r.topics);
      const totalAttempts = topics.reduce((sum, [, v]) => sum + v.t, 0);
      const totalCorrect = topics.reduce((sum, [, v]) => sum + v.c, 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
      const weakTopics = topics.filter(([, v]) => v.t > 0 && v.c / v.t < 0.6).map(([t]) => t);
      lines.push(`${r.name}: XP ${r.xp}, Streak ${r.streak}d, Accuracy ${accuracy}%${weakTopics.length ? `, Weak: ${weakTopics.join(", ")}` : ""}`);
    });
    return lines.join("\n");
  }

  function downloadCSV() {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-${schoolName.replace(/\s+/g, "-").toLowerCase()}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadText() {
    const text = generateTextReport();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exampadi-${schoolName.replace(/\s+/g, "-").toLowerCase()}-report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function shareWhatsApp() {
    const text = generateTextReport();
    shareToWhatsApp(text);
  }

  if (!roster.length) {
    return <div style={{ color: "var(--text-muted)", fontSize: 13, padding: 16 }}>No students to export yet.</div>;
  }

  return (
    <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 16, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <FileText size={18} color="var(--primary)" />
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Export Student Data</span>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button onClick={downloadCSV} disabled={exporting} style={{ padding: "10px 20px", borderRadius: 8, background: "#4ADE80", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Download size={14} /> Download CSV
        </button>
        <button onClick={downloadText} disabled={exporting} style={{ padding: "10px 20px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <FileText size={14} /> Download Report
        </button>
        <button onClick={shareWhatsApp} disabled={exporting} style={{ padding: "10px 20px", borderRadius: 8, background: "#25D366", border: "none", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <MessageCircle size={14} /> Share to WhatsApp
        </button>
      </div>
    </div>
  );
}

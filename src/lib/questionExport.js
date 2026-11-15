// Question bank spreadsheet export — full bank as CSV (opens in Excel/Sheets).
import { getQuestionsFromBank, getAllSubjects } from "../data/questions/compat";

function esc(v) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

// Export the full filtered bank as CSV
export function exportQuestionBankCSV(filters = {}) {
  const subjects = getAllSubjects();
  let all = [];
  for (const s of subjects) {
    const qs = getQuestionsFromBank({ subject: s, count: 10000, exam: "ALL" });
    all = all.concat(qs);
  }
  if (filters.subject && filters.subject !== "All Subjects") {
    all = all.filter((q) => q.subject === filters.subject);
  }
  if (filters.exam && filters.exam !== "ALL") {
    all = all.filter((q) => (q.exam || []).includes(filters.exam));
  }

  const rows = [
    ["ID", "Subject", "Topic", "Exam", "Year", "Difficulty", "Question", "A", "B", "C", "D", "Answer", "Explanation"],
    ...all.map((q) => [
      q.id, q.subject, q.topic, (q.exam || []).join("; "), q.year, q.difficulty,
      q.question,
      q.options?.A || "", q.options?.B || "", q.options?.C || "", q.options?.D || "",
      q.correctAnswer || q.answer || "",
      q.explanation || "",
    ]),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exampadi-question-bank-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return all.length;
}

// Export a compact summary spreadsheet (subject × exam counts)
export function exportQuestionSummaryCSV() {
  const subjects = getAllSubjects();
  const counts = {};
  for (const s of subjects) {
    const qs = getQuestionsFromBank({ subject: s, count: 10000, exam: "ALL" });
    counts[s] = qs.length;
  }
  const rows = [
    ["Subject", "Total Questions"],
    ...Object.entries(counts).sort((a, b) => b[1] - a[1]),
    ["TOTAL", Object.values(counts).reduce((a, b) => a + b, 0)],
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exampadi-question-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return rows.length - 2;
}
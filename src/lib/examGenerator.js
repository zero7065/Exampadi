// src/lib/examGenerator.js — builds printable exam PDFs.
// jsPDF is imported LAZILY by callers so ~350KB never lands in the main chunk.
import { getQuestionsFromBank } from "../data/questions/compat";

export function pickExamQuestions({ subject, topics = [], count = 20, exam = "JAMB" }) {
  const pool = getQuestionsFromBank({ subject, exam, count: 200 });
  const filtered = topics.length > 0
    ? pool.filter((q) => topics.some((t) => (q.topic || "").toLowerCase().includes(t.toLowerCase())))
    : pool;
  const source = filtered.length >= Math.min(count, 5) ? filtered : pool;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function buildExamPdf({ schoolName, subject, examBody, timeLimit, questions, teacherName }) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const pdf = new jsPDF();
  const W = pdf.internal.pageSize.getWidth();

  // Header
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(schoolName || "ExamPadi School Exam", W / 2, 18, { align: "center" });
  pdf.setFontSize(12);
  pdf.text(`${examBody || "JAMB"} · ${subject}`, W / 2, 26, { align: "center" });
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Time: ${timeLimit}  •  ${questions.length} questions  •  Name: ____________________  Class: ______`, W / 2, 33, { align: "center" });
  if (teacherName) pdf.text(`Set by: ${teacherName}`, W / 2, 39, { align: "center" });

  // Questions
  const body = questions.map((q, i) => [
    `${i + 1}. ${q.question}\nA) ${q.options.A}   B) ${q.options.B}\nC) ${q.options.C}   D) ${q.options.D}`,
  ]);
  autoTable(pdf, {
    startY: 44,
    head: [["QUESTIONS — choose the correct option"]],
    body,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [90, 122, 90] },
  });

  // Answer key on a fresh page
  pdf.addPage();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("ANSWER KEY (teachers only)", W / 2, 18, { align: "center" });
  autoTable(pdf, {
    startY: 26,
    head: [["#", "Answer", "Topic", "Explanation"]],
    body: questions.map((q, i) => [String(i + 1), q.correctAnswer || q.answer || "–", q.topic || "–", (q.explanation || "").slice(0, 220)]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [90, 122, 90] },
  });

  pdf.setFontSize(8);
  pdf.text(`Generated with ExamPadi · ${new Date().toLocaleDateString()}`, W / 2, pdf.internal.pageSize.getHeight() - 10, { align: "center" });

  return pdf;
}

export function downloadPdf(pdf, filename) {
  pdf.save(filename);
}

export function pdfToFile(pdf, _filename) {
  return pdf.output("blob");
}

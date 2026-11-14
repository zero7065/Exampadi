// api/rss/learning.js — Real RSS 2.0 feed of learning resources for ExamPadi.
// Served at /api/rss/learning — students/lecturers can subscribe in any RSS reader.
// Data is inlined (not imported from src) so the serverless bundle stays self-contained.

export const config = { runtime: "nodejs" };

const LEARNING_RESOURCES = [
  { id: "rss-001", title: "JAMB 2026 Registration Date Announced", description: "The Joint Admissions and Matriculation Board (JAMB) has announced that registration for the 2026 UTME will begin soon. Candidates are advised to create their profiles early.", category: "JAMB", url: "https://www.jamb.org.ng", source: "JAMB Official", publishedAt: "2026-01-15T10:00:00Z" },
  { id: "rss-002", title: "WAEC 2026 May/June Exam Timetable Released", description: "The West African Examinations Council has released the official timetable for the 2026 May/June WASSCE. Check your subject dates and plan your study schedule.", category: "WAEC", url: "https://www.waecnigeria.org", source: "WAEC Official", publishedAt: "2026-01-10T14:30:00Z" },
  { id: "rss-003", title: "How to Improve Your JAMB CBT Score: 5 Proven Strategies", description: "Learn the best strategies to boost your JAMB CBT score, including time management, question selection, and answer elimination techniques.", category: "Study Tips", url: "/guide/cbt", source: "ExamPadi", publishedAt: "2026-01-08T09:15:00Z" },
  { id: "rss-004", title: "Top 10 Most Repeated JAMB Questions in Mathematics", description: "Discover the most frequently repeated JAMB mathematics questions and learn how to solve them with step-by-step explanations.", category: "Mathematics", url: "/question-bank", source: "ExamPadi", publishedAt: "2026-01-05T11:00:00Z" },
  { id: "rss-005", title: "Understanding the New WAEC Grading System", description: "WAEC has updated its grading system. Learn what each grade means and how it affects your university admission chances.", category: "WAEC", url: "https://www.waecnigeria.org", source: "WAEC Official", publishedAt: "2026-01-03T16:45:00Z" },
  { id: "rss-006", title: "Free IELTS Preparation Resources for Nigerian Students", description: "A comprehensive list of free IELTS preparation resources, including practice tests, study guides, and tips from successful candidates.", category: "IELTS", url: "/ielts", source: "ExamPadi", publishedAt: "2025-12-28T13:20:00Z" },
  { id: "rss-007", title: "JAMB Change of Course and Institution: What You Need to Know", description: "Learn the process and deadlines for changing your JAMB course or institution, including required documents and fees.", category: "JAMB", url: "https://www.jamb.org.ng", source: "JAMB Official", publishedAt: "2025-12-20T08:30:00Z" },
  { id: "rss-008", title: "Effective Study Techniques for Long-Term Retention", description: "Discover evidence-based study techniques like spaced repetition, active recall, and the Feynman method to improve your learning.", category: "Study Tips", url: "/study-plan", source: "ExamPadi", publishedAt: "2025-12-15T10:45:00Z" },
  { id: "rss-009", title: "NECO 2026 June/July Exam Registration Guide", description: "Step-by-step guide to registering for the 2026 NECO June/July examinations, including fees, deadlines, and required documents.", category: "NECO", url: "https://www.mynecoexam.com", source: "NECO Official", publishedAt: "2025-12-10T12:00:00Z" },
  { id: "rss-010", title: "How to Choose the Right University Course After JAMB", description: "Factors to consider when choosing a university course, including your JAMB score, career goals, and admission requirements.", category: "Admissions", url: "/study-plan", source: "ExamPadi", publishedAt: "2025-12-05T14:15:00Z" },
  { id: "rss-011", title: "Physics Practical Exam Tips: Common Mistakes to Avoid", description: "Learn the common mistakes students make in physics practical exams and how to avoid them to score maximum marks.", category: "Physics", url: "/question-bank", source: "ExamPadi", publishedAt: "2025-11-28T09:30:00Z" },
  { id: "rss-012", title: "Chemistry: Understanding Organic Chemistry Nomenclature", description: "A comprehensive guide to IUPAC nomenclature for organic chemistry compounds, with examples and practice questions.", category: "Chemistry", url: "/question-bank", source: "ExamPadi", publishedAt: "2025-11-20T15:45:00Z" },
];

function escapeXml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = req.headers.host ? `${proto}://${req.headers.host}` : "https://exampadi.jadai.dev";

  const items = [...LEARNING_RESOURCES]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, 30)
    .map((r) => {
      const link = r.url.startsWith("http") ? r.url : `${origin}${r.url}`;
      return `    <item>
      <title>${escapeXml(r.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(r.id)}</guid>
      <category>${escapeXml(r.category)}</category>
      <dc:creator>${escapeXml(r.source)}</dc:creator>
      <pubDate>${new Date(r.publishedAt).toUTCString()}</pubDate>
      <description>${escapeXml(r.description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ExamPadi Learning Resources</title>
    <link>${origin}/reference</link>
    <atom:link href="${origin}/api/rss/learning" rel="self" type="application/rss+xml" />
    <description>Fresh JAMB, WAEC, NECO and IELTS news, study tips and exam guidance for Nigerian students.</description>
    <language>en-NG</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=600");
  res.status(200).send(xml);
}
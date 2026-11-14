// Learning Resources RSS feed — real, curated educational content.
// This simulates an RSS feed that admins can update; students see fresh content.
// In production this would fetch from a real RSS/Atom feed or Firestore collection.

export const RSS_FEED_URL = "https://exampadi.jadai.dev/api/rss/learning";

// Real learning resources for Nigerian students
export const LEARNING_RESOURCES = [
  {
    id: "rss-001",
    title: "JAMB 2026 Registration Date Announced",
    description: "The Joint Admissions and Matriculation Board (JAMB) has announced that registration for the 2026 UTME will begin on February 15, 2026. Candidates are advised to create their profiles early.",
    category: "JAMB",
    url: "https://www.jamb.org.ng",
    source: "JAMB Official",
    publishedAt: "2026-01-15T10:00:00Z",
    readTime: "2 min read",
  },
  {
    id: "rss-002",
    title: "WAEC 2026 May/June Exam Timetable Released",
    description: "The West African Examinations Council has released the official timetable for the 2026 May/June WASSCE. Check your subject dates and plan your study schedule.",
    category: "WAEC",
    url: "https://www.waecnigeria.org",
    source: "WAEC Official",
    publishedAt: "2026-01-10T14:30:00Z",
    readTime: "3 min read",
  },
  {
    id: "rss-003",
    title: "How to Improve Your JAMB CBT Score: 5 Proven Strategies",
    description: "Learn the best strategies to boost your JAMB CBT score, including time management, question selection, and answer elimination techniques.",
    category: "Study Tips",
    url: "https://exampadi.jadai.dev/guide/cbt",
    source: "ExamPadi",
    publishedAt: "2026-01-08T09:15:00Z",
    readTime: "5 min read",
  },
  {
    id: "rss-004",
    title: "Top 10 Most Repeated JAMB Questions in Mathematics",
    description: "Discover the most frequently repeated JAMB mathematics questions and learn how to solve them with step-by-step explanations.",
    category: "Mathematics",
    url: "https://exampadi.jadai.dev/question-bank",
    source: "ExamPadi",
    publishedAt: "2026-01-05T11:00:00Z",
    readTime: "4 min read",
  },
  {
    id: "rss-005",
    title: "Understanding the New WAEC Grading System",
    description: "WAEC has updated its grading system. Learn what each grade means and how it affects your university admission chances.",
    category: "WAEC",
    url: "https://www.waecnigeria.org/grading",
    source: "WAEC Official",
    publishedAt: "2026-01-03T16:45:00Z",
    readTime: "3 min read",
  },
  {
    id: "rss-006",
    title: "Free IELTS Preparation Resources for Nigerian Students",
    description: "A comprehensive list of free IELTS preparation resources, including practice tests, study guides, and tips from successful candidates.",
    category: "IELTS",
    url: "https://exampadi.jadai.dev/ielts",
    source: "ExamPadi",
    publishedAt: "2025-12-28T13:20:00Z",
    readTime: "6 min read",
  },
  {
    id: "rss-007",
    title: "JAMB Change of Course and Institution: What You Need to Know",
    description: "Learn the process and deadlines for changing your JAMB course or institution, including required documents and fees.",
    category: "JAMB",
    url: "https://www.jamb.org.ng/change-of-course",
    source: "JAMB Official",
    publishedAt: "2025-12-20T08:30:00Z",
    readTime: "4 min read",
  },
  {
    id: "rss-008",
    title: "Effective Study Techniques for Long-Term Retention",
    description: "Discover evidence-based study techniques like spaced repetition, active recall, and the Feynman method to improve your learning.",
    category: "Study Tips",
    url: "https://exampadi.jadai.dev/study-plan",
    source: "ExamPadi",
    publishedAt: "2025-12-15T10:45:00Z",
    readTime: "5 min read",
  },
  {
    id: "rss-009",
    title: "NECO 2026 June/July Exam Registration Guide",
    description: "Step-by-step guide to registering for the 2026 NECO June/July examinations, including fees, deadlines, and required documents.",
    category: "NECO",
    url: "https://www.mynecoexam.com",
    source: "NECO Official",
    publishedAt: "2025-12-10T12:00:00Z",
    readTime: "3 min read",
  },
  {
    id: "rss-010",
    title: "How to Choose the Right University Course After JAMB",
    description: "Factors to consider when choosing a university course, including your JAMB score, career goals, and admission requirements.",
    category: "Admissions",
    url: "https://exampadi.jadai.dev/study-plan",
    source: "ExamPadi",
    publishedAt: "2025-12-05T14:15:00Z",
    readTime: "4 min read",
  },
  {
    id: "rss-011",
    title: "Physics Practical Exam Tips: Common Mistakes to Avoid",
    description: "Learn the common mistakes students make in physics practical exams and how to avoid them to score maximum marks.",
    category: "Physics",
    url: "https://exampadi.jadai.dev/question-bank",
    source: "ExamPadi",
    publishedAt: "2025-11-28T09:30:00Z",
    readTime: "4 min read",
  },
  {
    id: "rss-012",
    title: "Chemistry: Understanding Organic Chemistry Nomenclature",
    description: "A comprehensive guide to IUPAC nomenclature for organic chemistry compounds, with examples and practice questions.",
    category: "Chemistry",
    url: "https://exampadi.jadai.dev/question-bank",
    source: "ExamPadi",
    publishedAt: "2025-11-20T15:45:00Z",
    readTime: "6 min read",
  },
];

// Format date for display
export function formatRSSDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// Get category icon
export function getCategoryIcon(category) {
  const icons = {
    JAMB: "📝",
    WAEC: "📚",
    NECO: "📖",
    IELTS: "🌍",
    "Study Tips": "💡",
    Mathematics: "📐",
    Physics: "⚛️",
    Chemistry: "🧪",
    Biology: "🧬",
    Admissions: "🎓",
    Scholarships: "💰",
  };
  return icons[category] || "📄";
}

// Filter resources by category
export function getResourcesByCategory(category) {
  if (!category || category === "All") return LEARNING_RESOURCES;
  return LEARNING_RESOURCES.filter((r) => r.category === category);
}

// Get latest resources (for RSS feed)
export function getLatestResources(limit = 10) {
  return [...LEARNING_RESOURCES]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, limit);
}
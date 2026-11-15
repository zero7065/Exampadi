// src/lib/stats.js — Single source of truth for all public statistics.
// Update these numbers monthly or when question bank changes.
// Both landing page and app components should import from here.

export const STATS = {
  /** Public practice-question target (all exams combined, real validated) */
  practiceQuestions: 1594,
  /** Number of high-yield topics covered */
  highYieldTopics: 320,
  /** Number of subjects available */
  subjects: 24,
  /** Number of exam bodies covered */
  examBodies: 7, // JAMB, WAEC, NECO, NABTEB, POST-UTME, IELTS, SAT
  /** Years of past questions */
  yearsOfQuestions: 10, // 2017–2026
  /** Chess levels vs AI */
  chessLevels: 10,
  /** Learning content styles (Legend Mode) */
  legendStyles: 8,
};

/** Per-exam share of the public question target (sums to STATS.practiceQuestions). */
export const EXAM_QUESTION_COUNTS = {
  JAMB: 721,
  WAEC: 373,
  NECO: 131,
  NABTEB: 108,
  "POST-UTME": 25,
  IELTS: 147,
  SAT: 89,
};

export const STATS_DISPLAY = {
  practiceQuestions: `${STATS.practiceQuestions.toLocaleString("en-NG")}+`,
  highYieldTopics: `${STATS.highYieldTopics.toLocaleString("en-NG")}+`,
  subjects: `${STATS.subjects}`,
  examBodies: `${STATS.examBodies}`,
  yearsOfQuestions: `${STATS.yearsOfQuestions} Years`,
};

/** Trust badges for hero section */
export const TRUST_BADGES = [
  { icon: "CheckCircle2", label: `${STATS_DISPLAY.practiceQuestions} Real Past Questions` },
  { icon: "WifiOff", label: "Works Offline" },
  { icon: "ShieldCheck", label: "Free to Start" },
  { icon: "Globe", label: "Built for Nigerian & West African Exams" },
];
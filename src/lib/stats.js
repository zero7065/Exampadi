// src/lib/stats.js — Single source of truth for all public statistics.
// Update these numbers monthly or when question bank changes.
// Both landing page and app components should import from here.

export const STATS = {
  /** Public practice-question target (all exams combined) */
  practiceQuestions: 9000,
  /** Number of high-yield topics covered */
  highYieldTopics: 320,
  /** Number of subjects available */
  subjects: 16,
  /** Number of exam bodies covered */
  examBodies: 5, // JAMB, WAEC, NECO, NABTEB, IELTS
  /** Years of past questions */
  yearsOfQuestions: 10, // 2017–2026
};

/** Per-exam share of the public question target (sums to STATS.practiceQuestions). */
export const EXAM_QUESTION_COUNTS = {
  JAMB: 4000,
  WAEC: 2000,
  NECO: 1300,
  NABTEB: 1100,
  IELTS: 600,
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
// Learning pattern tracking — stores per-user learning patterns as they practice.
// Tracks: time-of-day, pace, subject mastery trend, session length, best hours.
// Updated on each session; readable by admin/management for insights.
import {
  doc, getDoc, setDoc, updateDoc, increment, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Call after a practice session. Merges pattern data into users/{uid}/learningPattern.
export async function trackLearningPattern({ uid, subject, correct, total, timeSeconds, hourOfDay }) {
  needDb();
  if (!uid) return;
  const hour = hourOfDay ?? new Date().getHours();
  const bucket = hour < 6 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const ref = doc(db, "learningPatterns", uid);
  const snap = await getDoc(ref).catch(() => null);
  const existing = snap?.exists() ? snap.data() : {};

  const subjectStats = existing.subjectStats || {};
  const prev = subjectStats[subject] || { sessions: 0, correct: 0, total: 0, bestPct: 0 };
  subjectStats[subject] = {
    sessions: prev.sessions + 1,
    correct: prev.correct + correct,
    total: prev.total + total,
    bestPct: Math.max(prev.bestPct, pct),
    lastPct: pct,
    updatedAt: new Date().toISOString(),
  };

  const hourCounts = existing.hourCounts || { night: 0, morning: 0, afternoon: 0, evening: 0 };
  hourCounts[bucket] = (hourCounts[bucket] || 0) + 1;

  // Determine best study hour
  const bestBucket = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "morning";

  await setDoc(ref, {
    uid,
    totalSessions: (existing.totalSessions || 0) + 1,
    totalCorrect: (existing.totalCorrect || 0) + correct,
    totalQuestions: (existing.totalQuestions || 0) + total,
    avgPct: existing.totalQuestions
      ? Math.round(((existing.totalCorrect + correct) / (existing.totalQuestions + total)) * 100)
      : pct,
    avgSessionSeconds: existing.totalSessions
      ? Math.round(((existing.avgSessionSeconds || 0) * existing.totalSessions + timeSeconds) / (existing.totalSessions + 1))
      : timeSeconds,
    subjectStats,
    hourCounts,
    bestStudyHour: bestBucket,
    lastActive: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getLearningPattern(uid) {
  needDb();
  const snap = await getDoc(doc(db, "learningPatterns", uid)).catch(() => null);
  return snap?.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Admin: list patterns (all users)
export async function listLearningPatterns(max = 100) {
  needDb();
  const { collection, getDocs, query, orderBy, limit } = await import("firebase/firestore");
  const snap = await getDocs(query(collection(db, "learningPatterns"), orderBy("updatedAt", "desc"), limit(max)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// AI-style learning insight derived from the pattern
export function deriveLearningInsight(pattern) {
  if (!pattern) return null;
  const tips = [];
  if (pattern.bestStudyHour) {
    const labels = { night: "late night (12am-6am)", morning: "morning (6am-12pm)", afternoon: "afternoon (12pm-5pm)", evening: "evening (5pm-12am)" };
    tips.push(`You focus best in the ${labels[pattern.bestStudyHour] || pattern.bestStudyHour}. Schedule hard topics then.`);
  }
  const weak = Object.entries(pattern.subjectStats || {})
    .filter(([, s]) => s.total >= 5 && s.lastPct < 60)
    .sort((a, b) => a[1].lastPct - b[1].lastPct)[0];
  if (weak) tips.push(`${weak[0]} is your weakest subject (${weak[1].lastPct}% last session) — prioritize it this week.`);
  if (pattern.avgPct >= 80) tips.push(`Strong average (${pattern.avgPct}%) — try harder questions or mock exams.`);
  return { tips, pattern };
}
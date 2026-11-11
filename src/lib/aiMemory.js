// src/lib/aiMemory.js — per-student tutor memory (aiMemory/{uid}).
// Writes are BUFFERED in memory and flushed once per session to avoid
// Firestore write amplification. Caps prevent unbounded document growth.
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

const CAPS = { weak: 20, strong: 10, recent: 20, summaries: 10 };

// In-memory write buffers per uid: { interactions: [], style: null | string, summaries: [] }
const buffers = new Map();
const LS_PREFIX = "exampadi_aimem_buf_";

function getBuffer(uid) {
  if (!buffers.has(uid)) {
    let restored = { interactions: [], style: null, summaries: [] };
    try {
      const raw = localStorage.getItem(LS_PREFIX + uid);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") restored = { ...restored, ...parsed };
      }
    } catch (_) {}
    buffers.set(uid, restored);
  }
  return buffers.get(uid);
}

function persistBuffer(uid) {
  try {
    localStorage.setItem(LS_PREFIX + uid, JSON.stringify(getBuffer(uid)));
  } catch (_) {}
}

function freshMemory(uid) {
  return {
    uid,
    weakTopics: [],
    strongTopics: [],
    preferredStyle: null,
    recentQuestions: [],
    conversationSummaries: [],
    updatedAt: serverTimestamp(),
  };
}

export async function getStudentMemory(uid) {
  if (!uid || !db) return freshMemory(uid);
  try {
    const snap = await getDoc(doc(db, "aiMemory", uid));
    if (snap.exists()) return { ...freshMemory(uid), ...snap.data() };
    return freshMemory(uid);
  } catch (_) {
    return freshMemory(uid);
  }
}

// Buffer one answered question. NOT written to Firestore yet.
export function bufferInteraction(uid, { topic, subject, correct, questionText, aiResponse, answerKey }) {
  if (!uid) return;
  const buf = getBuffer(uid);
  buf.interactions.push({
    topic: topic || "General",
    subject: subject || "General",
    correct: !!correct,
    questionText: String(questionText || "").slice(0, 200),
    aiResponse: aiResponse ? String(aiResponse).slice(0, 500) : null,
    answerKey,
    at: Date.now(),
  });
  // Safety cap on the buffer itself
  if (buf.interactions.length > 100) {
    buf.interactions = buf.interactions.slice(-100);
  }
  persistBuffer(uid);
}

export function bufferStyle(uid, style) {
  if (!uid) return;
  getBuffer(uid).style = style;
  persistBuffer(uid);
}

export function bufferSummary(uid, summary) {
  if (!uid) return;
  getBuffer(uid).summaries.push(summary);
  persistBuffer(uid);
}

function mergeInteractions(mem, interactions) {
  const weak = Array.isArray(mem.weakTopics) ? [...mem.weakTopics] : [];
  const strong = Array.isArray(mem.strongTopics) ? [...mem.strongTopics] : [];
  const recent = Array.isArray(mem.recentQuestions) ? [...mem.recentQuestions] : [];

  for (const it of interactions) {
    recent.unshift({ text: it.questionText, topic: it.topic, correct: it.correct, at: it.at });

    const list = it.correct ? strong : weak;
    const key = `${it.subject}::${it.topic}`;
    const found = list.find((t) => `${t.subject}::${t.topic}` === key);
    if (found) {
      if (it.correct) found.correctCount = (found.correctCount || 0) + 1;
      else found.errorCount = (found.errorCount || 0) + 1;
      found.lastSeen = it.at;
    } else {
      list.push({
        subject: it.subject,
        topic: it.topic,
        errorCount: it.correct ? 0 : 1,
        correctCount: it.correct ? 1 : 0,
        lastSeen: it.at,
      });
    }
  }

  // Sort weak by errorCount desc, strong by correctCount desc, then cap
  weak.sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0) || (b.lastSeen || 0) - (a.lastSeen || 0));
  strong.sort((a, b) => (b.correctCount || 0) - (a.correctCount || 0) || (b.lastSeen || 0) - (a.lastSeen || 0));

  return {
    weakTopics: weak.slice(0, CAPS.weak),
    strongTopics: strong.slice(0, CAPS.strong),
    recentQuestions: recent.slice(0, CAPS.recent),
  };
}

// Flush buffered interactions + style + summaries to Firestore (single write).
// Returns true on success; on failure the buffer is kept for the next flush.
export async function flushMemory(uid) {
  if (!uid || !db) return false;
  const buf = getBuffer(uid);
  if (buf.interactions.length === 0 && !buf.style && buf.summaries.length === 0) return true;
  try {
    const snap = await getDoc(doc(db, "aiMemory", uid));
    const mem = snap.exists() ? snap.data() : freshMemory(uid);
    const merged = mergeInteractions(mem, buf.interactions);

    const summaries = Array.isArray(mem.conversationSummaries) ? [...mem.conversationSummaries] : [];
    for (const s of buf.summaries) summaries.unshift(s);

    await setDoc(doc(db, "aiMemory", uid), {
      uid,
      ...merged,
      ...(buf.style ? { preferredStyle: buf.style } : {}),
      conversationSummaries: summaries.slice(0, CAPS.summaries),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    buffers.set(uid, { interactions: [], style: null, summaries: [] });
    persistBuffer(uid);
    return true;
  } catch (e) {
    console.warn("flushMemory deferred (offline/degraded):", e?.code || e?.message);
    persistBuffer(uid);
    return false;
  }
}

// Batch-buffer a completed session's answers, then flush in one write.
// answerKey: the question field holding the correct answer ("answer" | "correctAnswer").
export async function recordSession(uid, questions, answers, answerKey = "answer") {
  if (!uid || !Array.isArray(questions)) return false;
  for (const q of questions) {
    const userAnswer = answers?.[q.id];
    if (userAnswer === undefined || userAnswer === null) continue;
    bufferInteraction(uid, {
      topic: q.topic,
      subject: q.subject,
      correct: userAnswer === q[answerKey],
      questionText: q.question,
    });
  }
  return flushMemory(uid);
}

// Convenience: record style immediately (used by onboarding/settings).
export async function recordStyle(uid, style) {
  bufferStyle(uid, style);
  return flushMemory(uid);
}

export function topWeakTopics(mem, n = 5) {
  const weak = Array.isArray(mem?.weakTopics) ? mem.weakTopics : [];
  return [...weak]
    .sort((a, b) => (b.errorCount || 0) - (a.errorCount || 0))
    .slice(0, n);
}

export function recentSummaries(mem, n = 3) {
  const sums = Array.isArray(mem?.conversationSummaries) ? mem.conversationSummaries : [];
  return sums.slice(0, n);
}

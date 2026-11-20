// Live trivia rooms — real-time 1v1 quiz. Both players answer the same
// questions; scores update live; the host advances when both have answered
// (or the per-question timer runs out).
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getQuestionsFromBank } from "../../data/questions/compat";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `QUIZ-${s}`;
}

export async function createTriviaRoom({ hostUid, hostName, subject = "Mixed", exam = "JAMB", count = 8, timePerQuestion = 20 }) {
  needDb();
  const qs = getQuestionsFromBank({ subject, count, exam });
  if (!qs.length) throw new Error("No questions available for that subject yet");
  const code = makeCode();
  await setDoc(doc(db, "triviaRooms", code), {
    code,
    hostUid,
    hostName: String(hostName || "Player 1").slice(0, 60),
    guestUid: null,
    guestName: null,
    subject,
    exam,
    timePerQuestion: Math.max(0, Math.min(120, Number(timePerQuestion) || 0)),
    questions: qs.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      answer: q.correctAnswer || q.answer,
    })),
    currentIndex: 0,
    answers: {},
    scores: {},
    status: "waiting",
    paused: false,
    pausedBy: null,
    pausedAt: null,
    questionStartedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

export function subscribeTriviaRoom(code, cb) {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, "triviaRooms", String(code || "").trim().toUpperCase()), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
}

export async function joinTriviaRoom(code, { uid, name }) {
  needDb();
  const ref = doc(db, "triviaRooms", String(code || "").trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Room not found. Check the code.");
  const room = snap.data();
  if (room.hostUid === uid) return { id: snap.id, ...room };
  if (room.guestUid && room.guestUid !== uid) throw new Error("This room already has two players.");
  await updateDoc(ref, {
    guestUid: uid,
    guestName: String(name || "Player 2").slice(0, 60),
    status: "active",
    questionStartedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return { id: snap.id, ...room, guestUid: uid };
}

// Record an answer + score for the current question.
export async function submitTriviaAnswer(code, { uid, qid, letter, correct }) {
  needDb();
  const ref = doc(db, "triviaRooms", String(code || "").trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.paused) return;
  const answers = { ...(room.answers || {}) };
  answers[uid] = { ...(answers[uid] || {}), [qid]: letter };
  const scores = { ...(room.scores || {}) };
  if (correct) scores[uid] = (scores[uid] || 0) + 1;
  await updateDoc(ref, { answers, scores, updatedAt: serverTimestamp() });
}

export async function setTriviaPaused(code, paused, byUid = null) {
  needDb();
  await updateDoc(doc(db, "triviaRooms", String(code || "").trim().toUpperCase()), {
    paused: !!paused,
    pausedBy: paused ? byUid : null,
    pausedAt: paused ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

// Host advances to the next question (or finishes).
export async function advanceTrivia(code, room) {
  needDb();
  const ref = doc(db, "triviaRooms", String(code || "").trim().toUpperCase());
  if (room.paused) return;
  const next = (room.currentIndex || 0) + 1;
  if (next >= (room.questions?.length || 0)) {
    await updateDoc(ref, { status: "finished", updatedAt: serverTimestamp() });
  } else {
    await updateDoc(ref, { currentIndex: next, questionStartedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
}

export async function leaveTriviaRoom(code, uid) {
  needDb();
  const ref = doc(db, "triviaRooms", String(code || "").trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data();
  if (room.hostUid === uid) {
    await updateDoc(ref, { status: "finished", updatedAt: serverTimestamp() });
  } else if (room.guestUid === uid) {
    await updateDoc(ref, { guestUid: null, guestName: null, status: "waiting", updatedAt: serverTimestamp() });
  }
}
// src/lib/rooms.js — lightweight shared study rooms.
//
// A room = a code + a fixed question set + live per-member progress.
// Creator generates questions once; joiners pull the same set and report
// progress into the room doc (live via onSnapshot). No presence infra.
//
// Moderation: user-created rooms start status "approved" so anyone with the
// code joins instantly. Admins can still close/delete abusive rooms from the
// moderation queue (setRoomStatus / deleteRoom).
//
// Answer keys: room docs deliberately carry NO correctAnswer and NO
// explanations (an explanation can give the answer away). The key for each
// question lives in studyRooms/{code}/key/{qid}, readable by NO client
// (firestore.rules) — only api/room-answer.js grades answers server-side.
import {
  doc, getDoc, updateDoc, deleteDoc, writeBatch, addDoc,
  collection, query, where, orderBy, limit, Timestamp,
  serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { apiUrl } from "./apiBase";
import { getQuestionsFromBank } from "../data/questions/compat";
import { timestampMs } from "./presence";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `ROOM-${s}`;
}

export async function createRoom({
  subject, count = 10, exam = "JAMB", hostUid, hostName,
  visibility = "public", goal = "", focusMinutes = 25, breakMinutes = 5,
  rounds = 4, allowChat = true, showLeaderboard = true, rules = "",
}) {
  needDb();
  const questions = getQuestionsFromBank({ subject, count, exam });
  if (questions.length === 0) throw new Error("No questions available for this subject yet");
  const code = makeCode();
  const roomRef = doc(db, "studyRooms", code);
  const batch = writeBatch(db);
  const focusMs = Math.max(1, Number(focusMinutes) || 25) * 60_000;
  // Room doc = everything players may see. NO answer key, NO explanations
  // (an explanation can give the answer away). The key goes to
  // studyRooms/{code}/key/{qid}, which firestore.rules denies to all clients.
  // Rooms are "approved" by default so anyone with the code can join immediately.
  // Public listing still requires admin approval (moderation queue).
  batch.set(roomRef, {
    code,
    subject,
    exam,
    hostUid,
    hostName: String(hostName || "Host").slice(0, 60),
    status: "approved",
    visibility: visibility === "private" ? "private" : "public",
    goal: String(goal || `Finish ${questions.length} questions together`).slice(0, 160),
    rules: String(rules || "Be kind. Explain your thinking. No spoilers while others are working.").slice(0, 500),
    allowChat: allowChat !== false,
    showLeaderboard: showLeaderboard !== false,
    active: true,
    timer: {
      enabled: true,
      running: false,
      phase: "focus",
      round: 1,
      rounds: Math.max(1, Math.min(12, Number(rounds) || 4)),
      focusMinutes: Math.max(1, Math.min(120, Number(focusMinutes) || 25)),
      breakMinutes: Math.max(1, Math.min(60, Number(breakMinutes) || 5)),
      remainingMs: focusMs,
      endsAt: null,
    },
    questions: questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      topic: q.topic || "",
    })),
    progress: { [hostUid]: { name: hostName || "Host", answered: 0, correct: 0, total: questions.length, updatedAt: serverTimestamp() } },
    createdAt: serverTimestamp(),
  });
  questions.forEach((q) => {
    batch.set(doc(roomRef, "key", String(q.id)), {
      hostUid,
      correct: String(q.correctAnswer || q.answer || "").toUpperCase().trim(),
      explanation: q.explanation || "",
    });
  });
  await batch.commit();
  return { code, total: questions.length };
}

export async function joinRoom(code, { uid, name }) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  const ref = doc(db, "studyRooms", clean);
  const snap = await getDoc(ref).catch(() => null);
  if (!snap || !snap.exists()) {
    throw new Error("Room not found. Check the code and try again.");
  }
  const room = snap.data();
  if (room.active === false) {
    throw new Error("This study room has ended. Ask the host to open a new one.");
  }
  if (room.allowLateJoin === false && Object.keys(room.progress || {}).length >= 1 && !room.progress?.[uid]) {
    throw new Error("This room is already in progress and is not accepting new members.");
  }
  // Rooms are approved by default. This check remains for backward compatibility.
  if (room.status !== "approved" && room.hostUid !== uid) {
    throw new Error("This room is awaiting admin approval — the host can play now, others once approved.");
  }
  // Idempotent: joining twice (e.g. refresh) must never reset a score, and
  // firestore.rules allows the progress write only when the user is not yet
  // a member — consistent by construction.
  if (room.progress?.[uid]) {
    return { id: snap.id, ...room };
  }
  await updateDoc(ref, {
    [`progress.${uid}`]: {
      name: String(name || "Student").slice(0, 60),
      answered: 0,
      correct: 0,
      total: (room.questions || []).length,
      updatedAt: serverTimestamp(),
    },
  });
  return { id: snap.id, ...room };
}

export function roomTimerRemaining(timer, now = Date.now()) {
  if (!timer?.enabled || timer.phase === "done") return 0;
  if (timer.running && timer.endsAt) return Math.max(0, timestampMs(timer.endsAt) - now);
  return Math.max(0, Number(timer.remainingMs) || 0);
}

export function formatRoomClock(ms) {
  const total = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export async function updateRoomSettings(code, patch = {}) {
  needDb();
  const clean = {};
  if (patch.goal != null) clean.goal = String(patch.goal).slice(0, 160);
  if (patch.rules != null) clean.rules = String(patch.rules).slice(0, 500);
  if (patch.allowChat != null) clean.allowChat = Boolean(patch.allowChat);
  if (patch.showLeaderboard != null) clean.showLeaderboard = Boolean(patch.showLeaderboard);
  if (patch.visibility != null) clean.visibility = patch.visibility === "private" ? "private" : "public";
  if (patch.active != null) clean.active = Boolean(patch.active);
  if (patch.allowLateJoin != null) clean.allowLateJoin = Boolean(patch.allowLateJoin);
  if (patch.pinnedMessage != null) clean.pinnedMessage = String(patch.pinnedMessage).slice(0, 300);
  if (patch.timer != null) clean.timer = patch.timer;
  await updateDoc(doc(db, "studyRooms", String(code || "").trim().toUpperCase()), {
    ...clean,
    updatedAt: serverTimestamp(),
  });
}

export async function startRoomTimer(code, timer) {
  needDb();
  const remaining = roomTimerRemaining(timer);
  const nextMs = remaining > 0
    ? remaining
    : Math.max(1, Number(timer?.focusMinutes) || 25) * 60_000;
  await updateRoomSettings(code, {
    timer: {
      ...timer,
      running: true,
      phase: timer?.phase === "done" ? "focus" : timer?.phase || "focus",
      round: timer?.phase === "done" ? 1 : timer?.round || 1,
      remainingMs: nextMs,
      endsAt: Timestamp.fromMillis(Date.now() + nextMs),
      startedAt: serverTimestamp(),
    },
  });
}

export async function pauseRoomTimer(code, timer) {
  needDb();
  const remaining = roomTimerRemaining(timer);
  await updateRoomSettings(code, {
    timer: {
      ...timer,
      running: false,
      remainingMs: remaining,
      endsAt: null,
    },
  });
}

export async function resetRoomTimer(code, timer) {
  needDb();
  const focusMs = Math.max(1, Number(timer?.focusMinutes) || 25) * 60_000;
  await updateRoomSettings(code, {
    timer: {
      ...timer,
      running: false,
      phase: "focus",
      round: 1,
      remainingMs: focusMs,
      endsAt: null,
    },
  });
}

export async function advanceRoomTimer(code, timer) {
  needDb();
  const focusMs = Math.max(1, Number(timer?.focusMinutes) || 25) * 60_000;
  const breakMs = Math.max(1, Number(timer?.breakMinutes) || 5) * 60_000;
  const rounds = Math.max(1, Number(timer?.rounds) || 4);
  const round = Math.max(1, Number(timer?.round) || 1);

  if (timer?.phase === "focus" && round >= rounds) {
    await updateRoomSettings(code, {
      timer: { ...timer, running: false, phase: "done", remainingMs: 0, endsAt: null },
    });
    return "done";
  }

  const nextPhase = timer?.phase === "break" ? "focus" : "break";
  const nextRound = timer?.phase === "break" ? Math.min(rounds, round + 1) : round;
  const nextMs = nextPhase === "focus" ? focusMs : breakMs;
  await updateRoomSettings(code, {
    timer: {
      ...timer,
      running: true,
      phase: nextPhase,
      round: nextRound,
      remainingMs: nextMs,
      endsAt: Timestamp.fromMillis(Date.now() + nextMs),
    },
  });
  return nextPhase;
}

export function subscribeRoomChat(code, cb) {
  if (!db || !code) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "studyRooms", code, "chat"), orderBy("createdAt", "asc"), limit(120)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function sendRoomChat(code, { fromUid, fromName, text, kind = "text" }) {
  needDb();
  const clean = String(text || "").trim().slice(0, 600);
  if (!clean) throw new Error("Write a message first");
  await addDoc(collection(db, "studyRooms", code, "chat"), {
    fromUid,
    fromName: String(fromName || "Student").slice(0, 60),
    text: clean,
    kind,
    createdAt: serverTimestamp(),
  });
}

export async function deleteRoomChatMessage(code, messageId) {
  needDb();
  await deleteDoc(doc(db, "studyRooms", code, "chat", messageId));
}

export async function setRoomPinnedMessage(code, message) {
  needDb();
  await updateRoomSettings(code, { pinnedMessage: String(message || "").slice(0, 300) });
}

// Server-side grading (api/room-answer.js). The answer key is never readable
// from the client, so the server compares the pick, updates progress, and
// returns the verdict for display. The room subscription picks up the new
// progress live — no client-side counter writes.
export async function submitRoomAnswer(code, { questionId, answer }) {
  const u = auth?.currentUser;
  if (!u) throw new Error("Sign in to answer");
  const token = await u.getIdToken();
  const res = await fetch(apiUrl("/api/room-answer"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      roomCode: String(code || "").trim().toUpperCase(),
      questionId: String(questionId || ""),
      answer: String(answer || ""),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error?.message || "Could not grade that answer");
  return data;
}

export function subscribeRoom(code, cb) {
  const unsub = onSnapshot(doc(db, "studyRooms", code), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
  return unsub;
}

export async function findRoom(code) {
  needDb();
  const snap = await getDoc(doc(db, "studyRooms", String(code || "").trim().toUpperCase()));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Real-time public listing: only approved rooms appear on the site.
export function subscribeApprovedRooms(cb, max = 20) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "studyRooms"), where("status", "==", "approved"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((data) => data.active !== false && data.visibility !== "private")
      .map((data) => ({
        id: data.id,
        code: data.code,
        subject: data.subject,
        exam: data.exam,
        hostName: data.hostName,
        goal: data.goal || "",
        timer: data.timer || null,
        memberCount: Object.keys(data.progress || {}).length,
        createdAt: data.createdAt,
      }))),
    () => cb([])
  );
}

// Real-time admin moderation queue for one status (pending/approved/rejected).
export function subscribeRoomQueue(status, cb, max = 40) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "studyRooms"), where("status", "==", status), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id, code: data.code, subject: data.subject, exam: data.exam,
        hostName: data.hostName, hostUid: data.hostUid, status: data.status,
        memberCount: Object.keys(data.progress || {}).length, createdAt: data.createdAt,
      };
    })),
    () => cb([])
  );
}

export async function setRoomStatus(code, status, adminUid, adminEmail) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  await updateDoc(doc(db, "studyRooms", clean), {
    status,
    moderatedAt: serverTimestamp(),
    moderatedBy: adminUid || null,
  });
  const { logActivity } = await import("./activityLog");
  await logActivity({
    action: "room_moderated", userId: adminUid, email: adminEmail,
    details: { roomCode: clean, status },
  }).catch(() => {});
}

export async function deleteRoom(code, adminUid, adminEmail) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  await deleteDoc(doc(db, "studyRooms", clean));
  const { logActivity } = await import("./activityLog");
  await logActivity({
    action: "room_deleted", userId: adminUid, email: adminEmail,
    details: { roomCode: clean },
  }).catch(() => {});
}

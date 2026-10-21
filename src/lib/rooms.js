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
  doc, getDoc, updateDoc, deleteDoc, writeBatch,
  collection, query, where, orderBy, limit,
  serverTimestamp, onSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { getQuestionsFromBank } from "../data/questions/compat";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `ROOM-${s}`;
}

export async function createRoom({ subject, count = 10, exam = "JAMB", hostUid, hostName }) {
  needDb();
  const questions = getQuestionsFromBank({ subject, count, exam });
  if (questions.length === 0) throw new Error("No questions available for this subject yet");
  const code = makeCode();
  const roomRef = doc(db, "studyRooms", code);
  const batch = writeBatch(db);
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

// Server-side grading (api/room-answer.js). The answer key is never readable
// from the client, so the server compares the pick, updates progress, and
// returns the verdict for display. The room subscription picks up the new
// progress live — no client-side counter writes.
export async function submitRoomAnswer(code, { questionId, answer }) {
  const u = auth?.currentUser;
  if (!u) throw new Error("Sign in to answer");
  const token = await u.getIdToken();
  const res = await fetch("/api/room-answer", {
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
    (snap) => cb(snap.docs.map((d) => {
      const data = d.data();
      return { id: d.id, code: data.code, subject: data.subject, exam: data.exam, hostName: data.hostName, createdAt: data.createdAt };
    })),
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

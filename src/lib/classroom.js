// Shared classroom session, whiteboard submissions, peer review and chat.
// All writes are class-scoped; answers live in a teacher-only key subcollection.
import {
  doc, getDoc, setDoc, updateDoc, collection, query, where,
  onSnapshot, addDoc, serverTimestamp, getDocs, limit,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { apiUrl } from "./apiBase";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

async function token() {
  return auth?.currentUser?.getIdToken?.() || null;
}

export async function notifyUser(toUid, { type = "system", title, body, link = "", actorName = "" } = {}) {
  if (!toUid) return;
  try {
    const t = await token();
    if (!t) return;
    await fetch(apiUrl("/api/notify"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ toUid, type, title, body, link, actorName }),
    });
  } catch {
    // Notifications are best-effort; the action itself already succeeded.
  }
}

// ─── Shared live session ───
export function subscribeClassSession(classId, cb) {
  if (!db || !classId) { cb(null); return () => {}; }
  return onSnapshot(doc(db, "classSessions", classId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
}

export async function startClassSession({
  classId, teacherUid, teacherName, subject, questions,
  instructions = "", questionSeconds = 0, mode = "guided",
  allowChat = true, showLeaderboard = true,
}) {
  needDb();
  const publicQuestions = (questions || []).map((q) => ({
    id: q.id, question: q.question, options: q.options, topic: q.topic,
    exam: q.exam, year: q.year, subject: q.subject,
  }));
  await setDoc(doc(db, "classSessions", classId), {
    classId,
    teacherUid,
    teacherName: teacherName || "Teacher",
    subject,
    questions: publicQuestions,
    currentIdx: 0,
    revealed: false,
    revealedAnswer: null,
    revealedExplanation: "",
    active: true,
    status: "live",
    mode: ["guided", "timed", "discussion"].includes(mode) ? mode : "guided",
    instructions: String(instructions || "").slice(0, 500),
    allowChat: allowChat !== false,
    showLeaderboard: showLeaderboard !== false,
    questionSeconds: Math.max(0, Math.min(900, Number(questionSeconds) || 0)),
    questionStartedAt: serverTimestamp(),
    questionEndsAt: Number(questionSeconds) > 0
      ? new Date(Date.now() + Number(questionSeconds) * 1000)
      : null,
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  // Seed answer keys (teacher-only; students cannot read this subcollection).
  await Promise.all((questions || []).map((q) => setDoc(doc(db, "classSessions", classId, "key", String(q.id)), {
    correctAnswer: q.correctAnswer || q.answer || null,
    explanation: q.explanation || "",
    teacherUid,
  })));
  return true;
}

export async function updateClassSession(classId, patch) {
  needDb();
  await updateDoc(doc(db, "classSessions", classId), { ...patch, updatedAt: serverTimestamp() });
}

export async function revealClassAnswer(classId, questionId) {
  needDb();
  const keySnap = await getDoc(doc(db, "classSessions", classId, "key", String(questionId)));
  if (!keySnap.exists()) throw new Error("Answer key missing for this question.");
  const key = keySnap.data() || {};
  await updateClassSession(classId, {
    revealed: true,
    revealedAnswer: key.correctAnswer || null,
    revealedExplanation: key.explanation || "",
  });
}

// ─── Whiteboard submissions ───
export function submissionId(classId, sessionId, questionId, studentUid) {
  return `${classId}_${sessionId || "s"}_${questionId}_${studentUid}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 240);
}

export async function saveClassSubmission({
  classId, sessionId, questionId, studentUid, studentName,
  strokes = [], thumbnail = "", text = "", status = "draft",
}) {
  needDb();
  const id = submissionId(classId, sessionId, questionId, studentUid);
  await setDoc(doc(db, "classSubmissions", id), {
    classId,
    sessionId: sessionId || null,
    questionId: String(questionId),
    studentUid,
    studentName: studentName || "Student",
    strokes,
    thumbnail,
    text: String(text || "").slice(0, 4000),
    status,
    submittedAt: status === "submitted" ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

export async function getClassSubmission(id) {
  if (!db || !id) return null;
  const snap = await getDoc(doc(db, "classSubmissions", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeClassSubmissions(classId, cb) {
  if (!db || !classId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classSubmissions"), where("classId", "==", classId), limit(80)),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => {
        const am = a.submittedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const bm = b.submittedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return bm - am;
      });
      cb(rows);
    },
    () => cb([]),
  );
}

export async function setSubmissionStatus(submissionIdValue, status) {
  needDb();
  await updateDoc(doc(db, "classSubmissions", submissionIdValue), {
    status,
    submittedAt: serverTimestamp(),
  });
}

export async function saveTeacherRemark(submissionIdValue, { teacherUid, teacherName, remark }) {
  needDb();
  await updateDoc(doc(db, "classSubmissions", submissionIdValue), {
    teacherRemarks: String(remark || "").slice(0, 4000),
    reviewedBy: teacherUid,
    reviewedByName: teacherName || "Teacher",
    reviewedAt: serverTimestamp(),
    status: "reviewed",
  });
}

export async function reactToSubmission({ submissionId: sid, classId, uid, type }) {
  needDb();
  const allowed = ["heart", "better", "down"];
  const safe = allowed.includes(type) ? type : "heart";
  await setDoc(doc(db, "classSubmissionReactions", `${sid}_${uid}`), {
    submissionId: sid, classId, uid, type: safe, updatedAt: serverTimestamp(),
  });
}

export function subscribeSubmissionReactions(sid, cb) {
  if (!db || !sid) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classSubmissionReactions"), where("submissionId", "==", sid), limit(200)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function addSubmissionComment({ submissionId: sid, classId, uid, name, text }) {
  needDb();
  await addDoc(collection(db, "classSubmissionComments"), {
    submissionId: sid, classId, uid, name: name || "Student",
    text: String(text || "").slice(0, 1000), createdAt: serverTimestamp(),
  });
}

export function subscribeSubmissionComments(sid, cb) {
  if (!db || !sid) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classSubmissionComments"), where("submissionId", "==", sid), limit(100)),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      cb(rows);
    },
    () => cb([]),
  );
}

// ─── Review requests (student picks any teacher) ───
export async function createReviewRequest({
  studentUid, studentName, teacherUid, teacherName, classId, submissionId: sid, questionId, message,
}) {
  needDb();
  const ref = await addDoc(collection(db, "reviewRequests"), {
    studentUid, studentName: studentName || "Student",
    teacherUid, teacherName: teacherName || "Teacher",
    classId: classId || null, submissionId: sid, questionId: String(questionId || ""),
    message: String(message || "").slice(0, 1000),
    status: "pending", createdAt: serverTimestamp(),
  });
  await notifyUser(teacherUid, {
    type: "review_request",
    title: `${studentName || "A student"} asked for review`,
    body: message || "Open the review inbox to see the work.",
    link: "/teacher/reviews",
    actorName: studentName,
  });
  return ref.id;
}

export async function listReviewRequestsForTeacher(teacherUid) {
  needDb();
  const snap = await getDocs(query(collection(db, "reviewRequests"), where("teacherUid", "==", teacherUid), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function listReviewRequestsForStudent(studentUid) {
  needDb();
  const snap = await getDocs(query(collection(db, "reviewRequests"), where("studentUid", "==", studentUid), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function updateReviewRequest(requestId, patch) {
  needDb();
  await updateDoc(doc(db, "reviewRequests", requestId), { ...patch, updatedAt: serverTimestamp() });
}

export function subscribeReviewMessages(requestId, cb) {
  if (!db || !requestId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "reviewRequests", requestId, "messages"), limit(100)),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      cb(rows);
    },
    () => cb([]),
  );
}

export async function sendReviewMessage(requestId, { fromUid, fromName, text }) {
  needDb();
  await addDoc(collection(db, "reviewRequests", requestId, "messages"), {
    fromUid, fromName: fromName || "User",
    text: String(text || "").slice(0, 2000), createdAt: serverTimestamp(),
  });
}

// ─── Class chat ───
export function subscribeClassChat(classId, cb) {
  if (!db || !classId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classChat", classId, "messages"), limit(100)),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      cb(rows);
    },
    () => cb([]),
  );
}

export async function sendClassChatMessage(classId, { fromUid, fromName, text }) {
  needDb();
  await addDoc(collection(db, "classChat", classId, "messages"), {
    fromUid, fromName: fromName || "User",
    text: String(text || "").slice(0, 2000), createdAt: serverTimestamp(),
  });
}

// ─── Per-question discussion ───
export function discussionId(classId, questionId) {
  return `${classId}_${questionId}`.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 240);
}

export async function ensureDiscussion({ classId, questionId, createdBy, title }) {
  needDb();
  const id = discussionId(classId, questionId);
  const ref = doc(db, "classDiscussions", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      classId, questionId: String(questionId), title: title || "Question discussion",
      createdBy, createdAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeDiscussionMessages(discussionIdValue, cb) {
  if (!db || !discussionIdValue) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classDiscussions", discussionIdValue, "messages"), limit(100)),
    (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      rows.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      cb(rows);
    },
    () => cb([]),
  );
}

export async function sendDiscussionMessage(discussionIdValue, { fromUid, fromName, text }) {
  needDb();
  await addDoc(collection(db, "classDiscussions", discussionIdValue, "messages"), {
    fromUid, fromName: fromName || "User",
    text: String(text || "").slice(0, 2000), createdAt: serverTimestamp(),
  });
}

// ─── Live class polls, announcements, and participation pulse ───
export function subscribeClassPolls(classId, cb) {
  if (!db || !classId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classPolls"), where("classId", "==", classId), where("active", "==", true), limit(12)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function voteClassPoll({ pollId, classId, studentUid, optionIdx }) {
  needDb();
  await setDoc(doc(db, "classPollVotes", `${pollId}_${studentUid}`), {
    pollId,
    classId,
    studentUid,
    optionIdx: Number(optionIdx),
    createdAt: serverTimestamp(),
  });
}

export function subscribeClassAnnouncements(classId, cb) {
  if (!db || !classId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classAnnouncements"), where("classId", "==", classId), where("active", "==", true), limit(12)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))),
    () => cb([]),
  );
}

export async function sendClassAnnouncement({ classId, teacherUid, message }) {
  needDb();
  const clean = String(message || "").trim().slice(0, 500);
  if (!clean) throw new Error("Write an announcement first");
  await addDoc(collection(db, "classAnnouncements"), {
    classId,
    teacherUid,
    message: clean,
    active: true,
    createdAt: serverTimestamp(),
  });
}

export async function setClassPulse(classId, { studentUid, studentName, state }) {
  needDb();
  const safe = ["understood", "confused", "working", "away"].includes(state) ? state : "working";
  await setDoc(doc(db, "classResponses", `${classId}_${studentUid}`), {
    classId,
    studentUid,
    studentName: studentName || "Student",
    state: safe,
    lastActive: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export function subscribeClassPulse(classId, cb) {
  if (!db || !classId) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "classResponses"), where("classId", "==", classId), limit(120)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

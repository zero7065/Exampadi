import {
  collection, addDoc, getDocs, getDoc, query, where, orderBy, limit,
  serverTimestamp, doc, setDoc, updateDoc,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { apiUrl } from "./apiBase";

const ASSIGNMENTS = "teacherAssignments";
const ANNOUNCEMENTS = "teacherAnnouncements";

export async function createAssignment({
  teacherId, teacherName, title, questions, studentIds = [], dueDate = null,
  subject, classId = null, schoolId = null, lessonPlanId = null,
}) {
  if (!db) throw new Error("Database not available");
  const clean = (questions || []).map((q) => ({
    id: String(q.id),
    question: q.question,
    options: q.options,
    subject: q.subject || subject || "",
    topic: q.topic || "",
    exam: q.exam || "",
    year: q.year || "",
  }));
  const ref = await addDoc(collection(db, ASSIGNMENTS), {
    teacherId,
    teacherName,
    title,
    questions: clean,
    questionCount: clean.length,
    studentIds,
    dueDate,
    subject,
    classId,
    schoolId,
    lessonPlanId,
    createdAt: serverTimestamp(),
    status: "active",
  });
  await Promise.all((questions || []).map((q) => setDoc(doc(db, ASSIGNMENTS, ref.id, "key", String(q.id)), {
    correctAnswer: q.correctAnswer ?? q.answer ?? "",
    explanation: q.explanation || "",
  })));
  return ref.id;
}

export async function getAssignment(assignmentId) {
  if (!db || !assignmentId) return null;
  const snap = await getDoc(doc(db, ASSIGNMENTS, assignmentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listAssignmentsForTeacher(teacherId) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ASSIGNMENTS), where("teacherId", "==", teacherId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAssignmentsForStudent(userId, classIds = []) {
  if (!db) return [];
  const byId = new Map();
  try {
    const direct = await getDocs(query(collection(db, ASSIGNMENTS), where("studentIds", "array-contains", userId), where("status", "==", "active")));
    direct.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
  } catch { /* index may still be warming up */ }
  const ids = (classIds || []).slice(0, 10);
  await Promise.all(ids.map(async (classId) => {
    try {
      const snap = await getDocs(query(collection(db, ASSIGNMENTS), where("classId", "==", classId), where("status", "==", "active")));
      snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
    } catch { /* ignore per-class failure */ }
  }));
  return [...byId.values()].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

export async function listAssignmentsForClass(classId) {
  if (!db || !classId) return [];
  const snap = await getDocs(query(collection(db, ASSIGNMENTS), where("classId", "==", classId), limit(100)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// One submission doc per student; the assignment doc itself is never mutated
// by a student (which rules correctly denied).
export async function submitAssignment(assignmentId, studentId, answers) {
  if (!db) throw new Error("Database not available");
  const token = await auth?.currentUser?.getIdToken?.();
  if (!token) throw new Error("Sign in to submit this assignment.");
  const res = await fetch(apiUrl("/api/grade-assignment"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ assignmentId, answers }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Could not submit assignment.");
  return { assignmentId, studentId, ...data };
}

export async function getSubmission(assignmentId, studentId) {
  if (!db) return null;
  const snap = await getDoc(doc(db, ASSIGNMENTS, assignmentId, "submissions", studentId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listSubmissions(assignmentId) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ASSIGNMENTS, assignmentId, "submissions")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function gradeSubmission(assignmentId, studentId, { score, remarks, gradedBy }) {
  if (!db) return;
  await updateDoc(doc(db, ASSIGNMENTS, assignmentId, "submissions", studentId), {
    score: Number(score) || 0,
    remarks: String(remarks || "").slice(0, 2000),
    gradedBy,
    gradedAt: serverTimestamp(),
    status: "graded",
  });
}

export async function createAnnouncement({ teacherId, teacherName, title, body, targetStudentIds = [], schoolId, classId = null }) {
  if (!db) throw new Error("Database not available");
  const ref = await addDoc(collection(db, ANNOUNCEMENTS), {
    teacherId,
    teacherName,
    title,
    body,
    targetStudentIds,
    schoolId,
    classId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listAnnouncementsForSchool(schoolId) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ANNOUNCEMENTS), where("schoolId", "==", schoolId), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listAnnouncementsForStudent(userId, schoolId) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, ANNOUNCEMENTS), where("schoolId", "==", schoolId), orderBy("createdAt", "desc")));
  return snap.docs.filter((d) => {
    const data = d.data();
    const targets = Array.isArray(data.targetStudentIds) ? data.targetStudentIds : [];
    return targets.length === 0 || targets.includes(userId);
  }).map((d) => ({ id: d.id, ...d.data() }));
}

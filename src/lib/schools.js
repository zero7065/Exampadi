// src/lib/schools.js \u2014 schools, classes, class invites, teacher notes.
import {
  doc, collection, addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, limit, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { logActivity } from "./activityLog";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

async function apiPost(path, body) {
  const token = await auth?.currentUser?.getIdToken?.();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Request failed");
  return data;
}

// \u2502\u2502\u2502 Schools \u2502\u2502\u2502
export async function createSchoolRequest(data) {
  needDb();
  const ref = await addDoc(collection(db, "schools"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createPilotRequest(data) {
  needDb();
  const ref = await addDoc(collection(db, "pilotRequests"), {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSchool(schoolId) {
  needDb();
  const snap = await getDoc(doc(db, "schools", schoolId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listSchools(status = null) {
  needDb();
  const q = status
    ? query(collection(db, "schools"), where("status", "==", status), limit(100))
    : query(collection(db, "schools"), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Admin: approve (optionally grant requester teacher role) or reject.
export async function setSchoolStatus(schoolId, status, adminUid, teacherUid = null) {
  needDb();
  const schoolSnap = await getDoc(doc(db, "schools", schoolId));
  const school = schoolSnap.exists() ? schoolSnap.data() : {};
  await updateDoc(doc(db, "schools", schoolId), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: adminUid,
    ...(teacherUid ? { teacherIds: arrayUnion(teacherUid) } : {}),
  });
  if (status === "approved") {
    // Partner Plan: every approved school gets a referral code (idempotent).
    try {
      const { ensurePartnerEnrolled } = await import("./partner");
      await ensurePartnerEnrolled(schoolId);
    } catch (e) {
      console.warn("Partner enrollment failed (non-fatal):", e?.message);
    }
  }
  if (status === "approved" && teacherUid) {
    await updateDoc(doc(db, "users", teacherUid), {
      role: "teacher",
      schoolId,
      schoolName: school.name || school.schoolName || null,
      updatedAt: serverTimestamp(),
    });
    // Give the new teacher a class to start with (only if the school has none).
    try {
      const existing = await getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId), limit(1)));
      if (existing.empty) {
        await createClass(schoolId, {
          name: "General",
          subject: "General",
          createdBy: adminUid,
          teacherId: teacherUid,
          teacherName: school.contactName || school.name || "Teacher",
        });
      }
    } catch (e) {
      console.warn("Default class creation failed (non-fatal):", e?.message);
    }
  }
  await logActivity({
    action: "school_status",
    userId: adminUid,
    details: { schoolId, status, teacherUid: teacherUid || null },
  });
}

// \u2502\u2502\u2502 Classes \u2502\u2502\u2502
export async function createClass(schoolId, { name, subject, createdBy, teacherId, teacherName, grade = "" }) {
  needDb();
  const tid = teacherId || createdBy;
  const ref = await addDoc(collection(db, "classes"), {
    schoolId: schoolId || null,
    name,
    subject,
    grade,
    teacherId: tid,
    teacherName: teacherName || "",
    students: [],
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listSchoolTeachers(schoolId) {
  needDb();
  if (!schoolId) return [];
  const snap = await getDocs(query(collection(db, "users"), where("schoolId", "==", schoolId), where("role", "==", "teacher"), limit(50)));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function listClassStudents(classId) {
  needDb();
  if (!classId) return [];
  const snap = await getDocs(query(collection(db, "users"), where("classIds", "array-contains", classId), limit(100)));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
}

export async function listSchoolClasses(schoolId) {
  needDb();
  const snap = await getDocs(query(collection(db, "classes"), where("schoolId", "==", schoolId), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClass(classId) {
  needDb();
  const snap = await getDoc(doc(db, "classes", classId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// \u2502\u2502\u2502 Class invites (code-based) \u2502\u2502\u2502
function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createClassInvite({ classId, schoolId, createdBy, teacherName = "", emails = [], expiresInDays = 30, maxUses = 200 }) {
  needDb();
  const code = makeCode();
  await setDoc(doc(db, "classInvites", code), {
    code,
    classId,
    schoolId: schoolId || null,
    createdBy,
    teacherName,
    emails,
    maxUses,
    status: "open",
    usedBy: [],
    expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function acceptClassInvite(code, _uid) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  return apiPost("/api/class-invite", { code: clean, action: "join" });
}

export async function getClassByInvite(code) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  try {
    const data = await apiPost("/api/class-invite", { code: clean, action: "preview" });
    return {
      classId: data.classId,
      schoolId: data.schoolId,
      name: data.name,
      subject: data.subject,
      teacherName: data.teacherName || "Teacher",
      studentCount: data.studentCount || 0,
      already: Boolean(data.already),
    };
  } catch {
    return null;
  }
}

// \u2502\u2502\u2502 Teacher notes (per student, visible to teacher + admin) \u2502\u2502\u2502
export async function saveTeacherNote({ schoolId, classId, studentUid, authorUid, note }) {
  needDb();
  const id = `${classId}_${studentUid}`;
  await setDoc(doc(db, "teacherNotes", id), {
    schoolId,
    classId,
    studentUid,
    note: String(note || "").slice(0, 1000),
    authorUid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getTeacherNote(classId, studentUid) {
  needDb();
  const snap = await getDoc(doc(db, "teacherNotes", `${classId}_${studentUid}`));
  return snap.exists() ? snap.data() : null;
}

// \u2502\u2502\u2502 Generated exams archive \u2502\u2502\u2502
export async function saveGeneratedExam(schoolId, exam) {
  needDb();
  const ref = await addDoc(collection(db, `schools/${schoolId}/exams`), {
    ...exam,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listGeneratedExams(schoolId) {
  needDb();
  const snap = await getDocs(query(collection(db, `schools/${schoolId}/exams`), limit(50)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Lesson plans (schemes of work) ───
export async function createLessonPlan({
  schoolId, classId, teacherId, teacherName, title, subject, topic,
  objectives = "", activities = "", resources = "", week = "", dueDate = null,
}) {
  needDb();
  const ref = await addDoc(collection(db, "lessonPlans"), {
    schoolId: schoolId || null,
    classId,
    teacherId,
    teacherName: teacherName || "",
    title: String(title || "Untitled lesson").slice(0, 160),
    subject: subject || "",
    topic: topic || "",
    objectives: String(objectives || "").slice(0, 2000),
    activities: String(activities || "").slice(0, 4000),
    resources: String(resources || "").slice(0, 2000),
    week: week || "",
    dueDate: dueDate || null,
    status: "published",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listLessonPlans({ classId, teacherId } = {}) {
  needDb();
  if (!classId && !teacherId) return [];
  const q = classId
    ? query(collection(db, "lessonPlans"), where("classId", "==", classId), limit(100))
    : query(collection(db, "lessonPlans"), where("teacherId", "==", teacherId), limit(100));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.week || "").localeCompare(b.week || "") || a.title.localeCompare(b.title));
}

export async function updateLessonPlan(planId, patch) {
  needDb();
  await updateDoc(doc(db, "lessonPlans", planId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLessonPlan(planId) {
  needDb();
  await deleteDoc(doc(db, "lessonPlans", planId));
}
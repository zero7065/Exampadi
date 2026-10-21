// src/lib/schools.js \u2014 schools, classes, class invites, teacher notes.
import {
  doc, collection, addDoc, getDoc, getDocs, setDoc, updateDoc,
  query, where, limit, serverTimestamp, arrayUnion,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { logActivity } from "./activityLog";

function needDb() {
  if (!db) throw new Error("Not available offline");
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
  await updateDoc(doc(db, "schools", schoolId), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: adminUid,
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
    });
  }
  await logActivity({
    action: "school_status",
    userId: adminUid,
    details: { schoolId, status, teacherUid: teacherUid || null },
  });
}

// \u2502\u2502\u2502 Classes \u2502\u2502\u2502
export async function createClass(schoolId, { name, subject, createdBy }) {
  needDb();
  const ref = await addDoc(collection(db, "classes"), {
    schoolId,
    name,
    subject,
    students: [],
    createdBy,
    createdAt: serverTimestamp(),
  });
  return ref.id;
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

export async function createClassInvite({ classId, schoolId, createdBy, emails = [] }) {
  needDb();
  const code = makeCode();
  await setDoc(doc(db, "classInvites", code), {
    code,
    classId,
    schoolId,
    createdBy,
    emails,
    status: "open",
    usedBy: [],
    createdAt: serverTimestamp(),
  });
  return code;
}

export async function acceptClassInvite(code, uid) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  const snap = await getDoc(doc(db, "classInvites", clean));
  if (!snap.exists()) throw new Error("Invite code not found");
  const inv = snap.data();
  if (inv.status !== "open") throw new Error("This invite is closed");
  await updateDoc(doc(db, "classes", inv.classId), { students: arrayUnion(uid) });
  await updateDoc(doc(db, "users", uid), { classIds: arrayUnion(inv.classId), schoolId: inv.schoolId });
  await updateDoc(doc(db, "classInvites", clean), { usedBy: arrayUnion(uid) });
  return { classId: inv.classId, schoolId: inv.schoolId };
}

export async function getClassByInvite(code) {
  needDb();
  const clean = String(code || "").trim().toUpperCase();
  const snap = await getDoc(doc(db, "classInvites", clean));
  if (!snap.exists()) return null;
  const inv = snap.data();
  if (inv.status !== "open") return null;
  const classSnap = await getDoc(doc(db, "classes", inv.classId));
  if (!classSnap.exists()) return null;
  const cls = classSnap.data();
  return {
    name: cls.name,
    subject: cls.subject,
    teacherName: cls.teacherName || "Teacher",
    studentCount: cls.students?.length || 0,
  };
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
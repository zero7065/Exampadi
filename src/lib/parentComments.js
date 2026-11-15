// Parent-teacher comments — a private thread between a teacher and a parent
// about a specific student. Teachers start threads; parents reply.
import {
  doc, getDoc, setDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Create or fetch a comment thread for (teacher, student, parent)
export async function ensureParentThread({ teacherUid, studentUid, studentName, parentUid }) {
  needDb();
  const id = `${teacherUid}_${studentUid}_${parentUid}`;
  const ref = doc(db, "parentThreads", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      teacherUid,
      studentUid,
      studentName: String(studentName || "Student").slice(0, 60),
      parentUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeParentThread(threadId, cb, max = 100) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "parentThreads", threadId, "messages"), orderBy("createdAt", "asc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function sendParentMessage(threadId, { fromUid, fromRole, text }) {
  needDb();
  const clean = String(text || "").trim().slice(0, 1000);
  if (!clean) throw new Error("Write a message first");
  await addDoc(collection(db, "parentThreads", threadId, "messages"), {
    fromUid,
    fromRole: fromRole === "teacher" ? "teacher" : "parent",
    text: clean,
    createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "parentThreads", threadId), { updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
}

export function subscribeTeacherThreads(teacherUid, cb, max = 30) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "parentThreads"), where("teacherUid", "==", teacherUid), orderBy("updatedAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
import { collection, addDoc, getDocs, query, where, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export async function createReminder({ uid, title, body = "", dueAt, link = "/dashboard" }) {
  if (!db) throw new Error("Database not available");
  const when = dueAt instanceof Date ? dueAt : new Date(dueAt);
  if (Number.isNaN(when.getTime())) throw new Error("Pick a valid reminder time.");
  const ref = await addDoc(collection(db, "reminders"), {
    uid,
    title: String(title || "Study reminder").slice(0, 120),
    body: String(body || "").slice(0, 500),
    link,
    dueAt: when,
    sent: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listReminders(uid) {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "reminders"), where("uid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const am = a.dueAt?.toMillis?.() || new Date(a.dueAt || 0).getTime();
      const bm = b.dueAt?.toMillis?.() || new Date(b.dueAt || 0).getTime();
      return am - bm;
    });
}

export async function markReminderDone(id) {
  if (!db) return;
  await updateDoc(doc(db, "reminders", id), { sent: true, doneAt: serverTimestamp() });
}

export async function deleteReminder(id) {
  if (!db) return;
  await deleteDoc(doc(db, "reminders", id));
}

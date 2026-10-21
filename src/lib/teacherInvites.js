import { collection, addDoc, getDocs, query, where, doc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";

const COLLECTION = "teacherInvites";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "TEACH-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createTeacherInvite({ schoolId = null, schoolName, createdBy, createdByName, expiresInDays = 30 }) {
  if (!db) throw new Error("Database not available");
  const code = generateCode();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const ref = await addDoc(collection(db, COLLECTION), {
    code,
    schoolId,
    schoolName,
    createdBy,
    createdByName,
    expiresAt,
    used: false,
    usedBy: null,
    usedAt: null,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, code, schoolId, schoolName, expiresAt };
}

export async function listTeacherInvites() {
  if (!db) return [];
  const snap = await getDocs(query(collection(db, COLLECTION), where("used", "==", false)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Server-only redemption: grants the teacher role atomically and consumes the
// invite. A client update to users.role is (correctly) denied by rules.
export async function redeemTeacherInvite(code) {
  const token = await auth?.currentUser?.getIdToken?.();
  if (!token) throw new Error("Sign in first");
  const res = await fetch("/api/redeem-teacher-invite", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: String(code || "").trim().toUpperCase() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Could not redeem that invite");
  return data.invite;
}

export async function revokeTeacherInvite(id) {
  if (!db) return;
  await deleteDoc(doc(db, COLLECTION, id));
}

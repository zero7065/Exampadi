// Management accounts — admin creates school-scoped management logins.
// Each management account: own email/password login, scoped to one school,
// can approve schools, pull sync, and message their school community.
// Invisible to other admins/management accounts (filtered by schoolId).
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db, auth, signInWithEmailAndPassword, signOut } from "../firebaseConfig";
import { apiUrl } from "./apiBase";
import { logActivity, isAdmin } from "./activityLog";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Create a management login via the admin-only server endpoint.
// ENFORCED: management accounts only exist for a registered, approved school.
export async function createManagementAccount({ email, password, name, schoolId, schoolName }) {
  if (!schoolId) throw new Error("Select a registered, approved school first");
  const u = auth?.currentUser;
  if (!u) throw new Error("Sign in as admin");
  if (!isAdmin(u)) throw new Error("Admin only");
  const token = await u.getIdToken();
  const res = await fetch(apiUrl("/api/create-management"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ email, password, name, schoolId, schoolName }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || "Failed to create management account");
  await logActivity({
    action: "management_created", userId: u.uid, email: u.email,
    details: { managementEmail: email, schoolId },
  }).catch(() => {});
  return data;
}

export function subscribeManagementAccounts(cb, max = 50) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "managementAccounts"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function setManagementStatus(uid, active) {
  needDb();
  await updateDoc(doc(db, "managementAccounts", uid), { active: !!active });
  await updateDoc(doc(db, "users", uid), { active: !!active }).catch(() => {});
}

export async function deleteManagementAccount(uid) {
  needDb();
  await updateDoc(doc(db, "managementAccounts", uid), { active: false, deleted: true });
}

// Sign in as a management account (uses the same Firebase Auth).
export async function signInManagement(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Approve a school as management (school-scoped).
export async function approveSchool(schoolId, status, uid) {
  needDb();
  await updateDoc(doc(db, "schools", schoolId), {
    status,
    moderatedAt: serverTimestamp(),
    moderatedBy: uid,
  });
  await logActivity({ action: "school_status", userId: uid, details: { schoolId, status } }).catch(() => {});
}
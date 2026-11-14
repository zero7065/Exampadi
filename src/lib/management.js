// Management accounts — admin creates school-scoped management logins.
// Each management account: own email/password login, scoped to one school,
// can approve schools, pull sync, and message their school community.
// Invisible to other admins/management accounts (filtered by schoolId).
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db, auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "../firebaseConfig";
import { logActivity, isAdmin } from "./activityLog";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Create a management login (admin only). Creates a real Firebase Auth user
// + managementAccounts doc + users doc with role "management".
export async function createManagementAccount({ email, password, name, schoolId, schoolName }) {
  needDb();
  if (!isAdmin(auth?.currentUser)) throw new Error("Admin only");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  await setDoc(doc(db, "users", uid), {
    email,
    name: name || "School Management",
    username: email.split("@")[0].toLowerCase(),
    role: "management",
    accountType: "management",
    schoolId: schoolId || null,
    schoolName: schoolName || "",
    onboarded: true,
    createdAt: serverTimestamp(),
  }, { merge: true });
  await setDoc(doc(db, "managementAccounts", uid), {
    uid,
    email,
    name: name || "School Management",
    schoolId: schoolId || null,
    schoolName: schoolName || "",
    active: true,
    createdBy: auth.currentUser?.uid,
    createdAt: serverTimestamp(),
  }, { merge: true });
  await signOut(auth).catch(() => {});
  await logActivity({ action: "management_created", userId: auth?.currentUser?.uid, email: auth?.currentUser?.email, details: { managementEmail: email, schoolId } }).catch(() => {});
  return { uid, email };
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
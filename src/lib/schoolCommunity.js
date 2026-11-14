// School community groups — auto-created per school when activated.
// Members: students + teachers of that school (isolated from other schools).
// Features: general group chat, member list, management-ID join.
// Students and teachers share the community with role badges.
import {
  doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// ─── Community group lifecycle ───

// Create (or fetch) the community group for a school. Idempotent.
export async function ensureSchoolCommunity({ schoolId, schoolName, managementId }) {
  needDb();
  if (!schoolId) throw new Error("schoolId required");
  const ref = doc(db, "communityGroups", schoolId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: snap.id, ...snap.data() };
  const welcome = `Welcome to ${schoolName || "our school"} community! 👋\n\nThis is your school's private space to:\n• Chat with classmates and teachers\n• Ask the AI study assistant for help\n• Share tips, questions and resources\n\nBe kind, stay on topic, and help each other succeed.`;
  await setDoc(ref, {
    schoolId,
    schoolName: schoolName || "",
    managementId: managementId || "",
    memberCount: 0,
    welcome,
    active: true,
    createdAt: serverTimestamp(),
  });
  return { id: schoolId, schoolName, managementId, welcome };
}

export function subscribeCommunity(groupId, cb) {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, "communityGroups", groupId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
}

// ─── Membership ───

// Join a school community by management ID / group id.
export async function joinCommunity({ groupId, uid, name, role }) {
  needDb();
  const ref = doc(db, "communityGroups", String(groupId || "").trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Community not found. Check the code.");
  const data = snap.data();
  if (data.active === false) throw new Error("This community is inactive.");
  await setDoc(doc(db, "communityMembers", `${groupId}_${uid}`), {
    groupId,
    uid,
    name: String(name || "Member").slice(0, 60),
    role: role === "teacher" ? "teacher" : "student",
    joinedAt: serverTimestamp(),
  }, { merge: true });
  await updateDoc(ref, { memberCount: (data.memberCount || 0) + 1 }).catch(() => {});
  return { id: snap.id, ...data };
}

export async function leaveCommunity(groupId, uid) {
  needDb();
  await deleteDoc(doc(db, "communityMembers", `${groupId}_${uid}`)).catch(() => {});
}

export function subscribeCommunityMembers(groupId, cb, max = 100) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "communityMembers"), where("groupId", "==", groupId), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function isCommunityMember(groupId, uid) {
  needDb();
  const snap = await getDoc(doc(db, "communityMembers", `${groupId}_${uid}`)).catch(() => null);
  return snap?.exists() || false;
}

// ─── Group chat (community messages) ───

export function subscribeCommunityChat(groupId, cb, max = 100) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "communityGroups", groupId, "messages"), orderBy("createdAt", "asc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function sendCommunityMessage(groupId, { fromUid, fromName, text, role }) {
  needDb();
  const clean = String(text || "").trim().slice(0, 600);
  if (!clean) throw new Error("Write a message first");
  await addDoc(collection(db, "communityGroups", groupId, "messages"), {
    fromUid,
    fromName: String(fromName || "Member").slice(0, 60),
    role: role === "teacher" ? "teacher" : "student",
    text: clean,
    createdAt: serverTimestamp(),
  });
}

export async function deleteCommunityMessage(groupId, messageId) {
  needDb();
  await deleteDoc(doc(db, "communityGroups", groupId, "messages", messageId));
}

// ─── Student-created groups (study/gist/games) ───

export async function createUserGroup({ name, description, topic, createdBy, createdByName, schoolId }) {
  needDb();
  const ref = await addDoc(collection(db, "userGroups"), {
    name: String(name || "Study group").slice(0, 60),
    description: String(description || "").slice(0, 200),
    topic: String(topic || "General").slice(0, 40),
    schoolId: schoolId || null,
    createdBy,
    createdByName: String(createdByName || "Student").slice(0, 60),
    members: [createdBy],
    memberCount: 1,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function joinUserGroup(groupId, uid) {
  needDb();
  const ref = doc(db, "userGroups", groupId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Group not found");
  const data = snap.data();
  if (data.members?.includes(uid)) return;
  await updateDoc(ref, {
    members: [...(data.members || []), uid],
    memberCount: (data.memberCount || 0) + 1,
  });
}

export function subscribeUserGroups(cb, max = 30) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "userGroups"), where("active", "==", true), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export function subscribeUserGroupChat(groupId, cb, max = 100) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "userGroups", groupId, "messages"), orderBy("createdAt", "asc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function sendUserGroupMessage(groupId, { fromUid, fromName, text }) {
  needDb();
  const clean = String(text || "").trim().slice(0, 600);
  if (!clean) throw new Error("Write a message first");
  await addDoc(collection(db, "userGroups", groupId, "messages"), {
    fromUid,
    fromName: String(fromName || "Student").slice(0, 60),
    text: clean,
    createdAt: serverTimestamp(),
  });
}
// Friend share & referral — share a question / teaser / chess challenge.
// A visitor opens the link → signs in with Google → we auto-link them to the
// sharer as a study partner, so they can start chatting immediately.
import { doc, getDoc, addDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { addPartner } from "./studyPartners";

const FRIEND_REF_KEY = "ep_friend_ref";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Create a shareable item doc and return its id.
export async function createSharedItem({ sharerUid, sharerName, type, title, body, options, answer, extra }) {
  needDb();
  const ref = await addDoc(collection(db, "sharedItems"), {
    sharerUid,
    sharerName: String(sharerName || "A friend").slice(0, 60),
    type: String(type || "question").slice(0, 20), // question | teaser | chess | trivia
    title: String(title || "").slice(0, 200),
    body: String(body || "").slice(0, 800),
    options: Array.isArray(options) ? options.slice(0, 6).map((o) => String(o).slice(0, 200)) : [],
    answer: String(answer || "").slice(0, 400),
    extra: extra && typeof extra === "object" ? extra : {},
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSharedItem(id) {
  needDb();
  const snap = await getDoc(doc(db, "sharedItems", id)).catch(() => null);
  return snap?.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function shareItemLink(id) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://exampadi.jadai.dev";
  return `${origin}/share/${id}`;
}

// Store the sharer's uid from the URL (?fref=UID&fname=Name) for redemption.
export function captureFriendRefFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const fref = String(params.get("fref") || "").trim();
    const fname = String(params.get("fname") || "").trim();
    if (fref) {
      localStorage.setItem(FRIEND_REF_KEY, JSON.stringify({ uid: fref, name: fname }));
      return { uid: fref, name: fname };
    }
  } catch { /* private mode */ }
  return null;
}

export function readStoredFriendRef() {
  try {
    const raw = localStorage.getItem(FRIEND_REF_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearFriendRef() {
  try { localStorage.removeItem(FRIEND_REF_KEY); } catch { /* ignore */ }
}

// After sign-in/up: if a friend ref exists and it's not the same user,
// auto-create the study-pair so they can chat. Returns { partnerUid, pairId }.
export async function redeemFriendRef(user) {
  if (!db || !user?.uid) return null;
  const stored = readStoredFriendRef();
  if (!stored?.uid || stored.uid === user.uid) { clearFriendRef(); return null; }
  try {
    await addPartner(user.uid, stored.uid);
    clearFriendRef();
    return { partnerUid: stored.uid, partnerName: stored.name || "Friend" };
  } catch (e) {
    // Already partners is fine — treat as success.
    if (String(e?.message || "").toLowerCase().includes("already")) {
      clearFriendRef();
      return { partnerUid: stored.uid, partnerName: stored.name || "Friend" };
    }
    return null;
  }
}
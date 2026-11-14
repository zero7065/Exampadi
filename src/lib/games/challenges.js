// Game challenges — account-vs-account game invites + results + likes.
// A user challenges another; the challenged accepts; result recorded; stats shareable with likes.
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

// Send a game challenge to another user
export async function createChallenge({ fromUid, fromName, toUid, toName, game, level }) {
  needDb();
  const ref = await addDoc(collection(db, "gameChallenges"), {
    fromUid, fromName: String(fromName || "Student").slice(0, 60),
    toUid, toName: String(toName || "Student").slice(0, 60),
    game: game || "chess",
    level: level || 5,
    status: "pending",
    result: null,
    likes: [],
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeIncomingChallenges(uid, cb, max = 20) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "gameChallenges"), where("toUid", "==", uid), where("status", "==", "pending"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export function subscribeOutgoingChallenges(uid, cb, max = 20) {
  if (!db) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "gameChallenges"), where("fromUid", "==", uid), orderBy("createdAt", "desc"), limit(max)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function respondChallenge(challengeId, accept, uid) {
  needDb();
  await updateDoc(doc(db, "gameChallenges", challengeId), {
    status: accept ? "accepted" : "declined",
    respondedAt: serverTimestamp(),
  });
}

export async function recordChallengeResult(challengeId, { winnerUid, winnerName, loserUid, loserName, detail }) {
  needDb();
  await updateDoc(doc(db, "gameChallenges", challengeId), {
    status: "completed",
    result: { winnerUid, winnerName, loserUid, loserName, detail: String(detail || "").slice(0, 120) },
    completedAt: serverTimestamp(),
  });
}

// Like a challenge result (shareable stat)
export async function likeChallenge(challengeId, uid) {
  needDb();
  const { increment, arrayUnion, arrayRemove } = await import("firebase/firestore");
  const ref = doc(db, "gameChallenges", challengeId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data();
  const liked = data.likes?.includes(uid);
  await updateDoc(ref, {
    likes: liked ? data.likes.filter((x) => x !== uid) : [...(data.likes || []), uid],
    likeCount: increment(liked ? -1 : 1),
  });
}

// Subscribe to a challenge doc (for result updates)
export function subscribeChallenge(challengeId, cb) {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, "gameChallenges", challengeId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
}
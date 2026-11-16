// Chess results — shareable, click-bait performance cards.
// A finished game can be saved as a public result doc with a share link like
// /chess/result/<id>. Visitors see the outcome + a "Can you beat this?" CTA.
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

export async function createChessResult({ uid, name, mode, levelName, level, result, moves, timeControl, opponentName }) {
  needDb();
  const ref = await addDoc(collection(db, "chessResults"), {
    uid,
    name: String(name || "Player").slice(0, 60),
    mode: mode || "ai", // ai | friend
    levelName: String(levelName || "").slice(0, 40),
    level: Number(level) || 0,
    result: String(result || "").slice(0, 40), // win | loss | draw | checkmate | resignation | timeout
    moves: Array.isArray(moves) ? moves.slice(0, 400) : [],
    timeControl: String(timeControl || "unlimited").slice(0, 30),
    opponentName: String(opponentName || "AI").slice(0, 60),
    likes: [],
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getChessResult(id) {
  needDb();
  const snap = await getDoc(doc(db, "chessResults", id)).catch(() => null);
  return snap?.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function likeChessResult(id, uid) {
  needDb();
  const { updateDoc, increment } = await import("firebase/firestore");
  const ref = doc(db, "chessResults", id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const liked = (snap.data().likes || []).includes(uid);
  await updateDoc(ref, {
    likes: liked ? snap.data().likes.filter((x) => x !== uid) : [...(snap.data().likes || []), uid],
    likeCount: increment(liked ? -1 : 1),
  });
}

export function chessResultLink(id) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://exampadi.jadai.dev";
  return `${origin}/chess/result/${id}?ref=CHESS`;
}
// Chess multiplayer — shareable chess rooms with timer or custom time control.
// A room = code + settings (time control) + both players + live moves.
// Players share the invite code/link; either can create; both sync moves live.
import {
  doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { Chess } from "chess.js";
import { db } from "../../firebaseConfig";

function needDb() {
  if (!db) throw new Error("Not available offline");
}

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `CHESS-${s}`;
}

// Create a chess room. timeControl: "unlimited" | "timed" | "custom"
export async function createChessRoom({ hostUid, hostName, timeControl = "unlimited", customMinutes = 10 }) {
  needDb();
  const code = makeCode();
  const roomRef = doc(db, "chessRooms", code);
  const seconds = timeControl === "timed" ? 300 : timeControl === "custom" ? Math.max(1, Number(customMinutes) || 10) * 60 : 0;
  await setDoc(roomRef, {
    code,
    hostUid,
    hostName: String(hostName || "Player 1").slice(0, 60),
    hostColor: "w",
    guestUid: null,
    guestName: null,
    timeControl,
    initialSeconds: seconds,
    whiteTimeMs: timeControl === "unlimited" ? 0 : seconds * 1000,
    blackTimeMs: timeControl === "unlimited" ? 0 : seconds * 1000,
    status: "waiting",
    fen: new Chess().fen(),
    pgn: "",
    turn: "w",
    result: null,
    winnerUid: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return code;
}

export function subscribeChessRoom(code, cb) {
  if (!db) { cb(null); return () => {}; }
  return onSnapshot(doc(db, "chessRooms", String(code || "").trim().toUpperCase()), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, () => cb(null));
}

// Join a chess room as the guest (second player)
export async function joinChessRoom(code, { uid, name }) {
  needDb();
  const ref = doc(db, "chessRooms", String(code || "").trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Room not found. Check the code.");
  const room = snap.data();
  if (room.hostUid === uid) return { id: snap.id, ...room }; // host rejoining
  if (room.guestUid && room.guestUid !== uid) throw new Error("This room already has two players.");
  await updateDoc(ref, {
    guestUid: uid,
    guestName: String(name || "Player 2").slice(0, 60),
    status: "active",
    startedAt: serverTimestamp(),
  });
  return { id: snap.id, ...room, guestUid: uid };
}

// Push a move (FEN + PGN + whose turn) into the room. Both clients sync.
export async function syncChessMove(code, { fen, pgn, turn, lastMove, whiteTimeMs, blackTimeMs }) {
  needDb();
  const patch = { fen, pgn, updatedAt: serverTimestamp() };
  if (lastMove) patch.lastMove = lastMove;
  if (turn) patch.turn = turn;
  if (typeof whiteTimeMs === "number") patch.whiteTimeMs = Math.max(0, Math.round(whiteTimeMs));
  if (typeof blackTimeMs === "number") patch.blackTimeMs = Math.max(0, Math.round(blackTimeMs));
  await updateDoc(doc(db, "chessRooms", String(code || "").trim().toUpperCase()), patch).catch(() => {});
}

// Finish a room with a result + winner
export async function finishChessRoom(code, { result, winnerUid = null, winnerName = null, reason }) {
  needDb();
  await updateDoc(doc(db, "chessRooms", String(code || "").trim().toUpperCase()), {
    status: "finished",
    result: result || "draw",
    winnerUid,
    winnerName,
    reason: reason || "",
    endedAt: serverTimestamp(),
  });
}

// Resign / abort
export async function resignChessRoom(code, uid) {
  needDb();
  const ref = doc(db, "chessRooms", String(code || "").trim().toUpperCase());
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const room = snap.data();
  const winnerUid = room.hostUid === uid ? room.guestUid : room.hostUid;
  const winnerName = room.hostUid === uid ? room.guestName : room.hostName;
  await updateDoc(ref, {
    status: "finished",
    result: "resign",
    winnerUid,
    winnerName,
    endedAt: serverTimestamp(),
  });
}
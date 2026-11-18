// Offline/degraded write queue: when a Firestore write fails due to network,
// queue it in localStorage and flush when reachable again.
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const LS_KEY = "exampadi_offline_queue";
const MAX_OPS = 200;

function load() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function save(ops) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ops.slice(-MAX_OPS)));
  } catch (_) {
    // storage unavailable (private mode/quota) — keep in-memory copy
  }
}

let pending = load();
let flushing = false;
const listeners = new Set();

export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => {
    try { fn(pending.length); } catch (_) {
      // listener threw — keep notifying the rest
    }
  });
}

function enqueue(op) {
  pending = [...pending, { ...op, timestamp: Date.now() }].slice(-MAX_OPS);
  save(pending);
  emit();
}

// Fire-and-forget write: try now, queue on failure.
export async function queueFirestoreWrite(path, data, { merge = true } = {}) {
  const op = { kind: "set", path, data, merge };
  try {
    await setDoc(doc(db, path), data, { merge });
    return { queued: false };
  } catch (e) {
    // Rules rejections never succeed on retry — replaying amplifies errors.
    if (e?.code === "permission-denied") {
      console.warn("Firestore write rejected by rules:", path);
      return { queued: false, rejected: true };
    }
    enqueue(op);
    console.warn("Firestore write queued (offline/degraded):", path, e?.code || e?.message);
    return { queued: true };
  }
}

export async function queueFirestoreAdd(collectionPath, data) {
  const op = { kind: "add", collectionPath, data };
  try {
    await addDoc(collection(db, collectionPath), data);
    return { queued: false };
  } catch (e) {
    if (e?.code === "permission-denied") {
      console.warn("Firestore add rejected by rules:", collectionPath);
      return { queued: false, rejected: true };
    }
    enqueue(op);
    console.warn("Firestore add queued (offline/degraded):", collectionPath, e?.code || e?.message);
    return { queued: true };
  }
}

// Replay queued writes. Returns number successfully flushed.
export async function flushQueue() {
  if (flushing) return 0;
  if (pending.length === 0) return 0;
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;

  flushing = true;
  const failed = [];
  let flushed = 0;

  for (const op of pending) {
    try {
      if (op.kind === "add") {
        await addDoc(collection(db, op.collectionPath), op.data);
      } else {
        await setDoc(doc(db, op.path), op.data, { merge: op.merge !== false });
      }
      flushed++;
    } catch (e) {
      if (e?.code === "permission-denied") {
        // Permanent rejection — drop it so it stops failing forever.
        continue;
      }
      failed.push(op);
      // Stop on the first failure — network is likely still down.
      const idx = pending.indexOf(op);
      failed.push(...pending.slice(idx + 1));
      break;
    }
  }

  pending = failed.slice(-MAX_OPS);
  save(pending);
  flushing = false;
  emit();
  return flushed;
}

export function queuedWriteCount() {
  return pending.length;
}

// Auto-flush when back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flushQueue().catch(() => {});
  });
  window.addEventListener("focus", () => {
    flushQueue().catch(() => {});
  });
}

import { doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const PRESENCE_TTL_MS = 180_000;

function timestampValue(value) {
  if (typeof value === "number") return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  return 0;
}

export function timestampMs(value) {
  return timestampValue(value);
}

export function isOnline(data) {
  if (!data || data.state !== "online") return false;
  const updatedAt = timestampValue(data.updatedAt || data.timestamp);
  return updatedAt > 0 && Date.now() - updatedAt < PRESENCE_TTL_MS;
}

export function subscribePresenceForUids(uids, callback) {
  if (!db || !Array.isArray(uids) || typeof callback !== "function") {
    callback?.({});
    return () => {};
  }

  const entries = new Map();
  const uniqueUids = [...new Set(uids.filter(Boolean))].slice(0, 60);
  const unsubs = uniqueUids.map((uid) => onSnapshot(
    doc(db, "presence", uid),
    (snapshot) => {
      if (snapshot.exists()) entries.set(uid, snapshot.data());
      else entries.delete(uid);
      callback(Object.fromEntries(entries));
    },
    () => {
      entries.delete(uid);
      callback(Object.fromEntries(entries));
    },
  ));

  return () => unsubs.forEach((unsubscribe) => unsubscribe());
}

export function subscribePresence(callback) {
  return subscribePresenceForUids([], callback);
}

export async function setPresence(uid, state = "online", data = {}) {
  if (!db || !uid) return;
  const ref = doc(db, "presence", uid);
  const patch = {
    ...data,
    state,
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, patch, { merge: true });
}

export function trackPresence(uid, data = {}) {
  if (!db || !uid || typeof window === "undefined") return () => {};

  const ref = doc(db, "presence", uid);
  let stopped = false;
  const update = (state) => updateDoc(ref, {
    ...data,
    state,
    updatedAt: serverTimestamp(),
  }).catch(() => {});

  setDoc(ref, { ...data, state: "online", updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
  const heartbeat = window.setInterval(() => {
    if (document.visibilityState === "visible") update("online");
  }, 45_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") update("online");
  };
  const onPageHide = () => update("offline");
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pagehide", onPageHide);

  return () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(heartbeat);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pagehide", onPageHide);
    update("offline");
  };
}

export function formatTimeAgo(value) {
  const timestamp = timestampValue(value);
  if (!timestamp) return "unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Smart sync — client-side 72h sync to admin + Vercel daily cron support.
// Only syncs when there is new activity since last sync (smart, not blind).
import {
  collection, getDocs, query, where, orderBy, limit, setDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

const SYNC_KEY = "exampadi_last_sync";
const SYNC_INTERVAL_MS = 72 * 60 * 60 * 1000; // 72 hours

// Returns true if it's time to sync (interval elapsed).
export function shouldSync() {
  try {
    const last = Number(localStorage.getItem(SYNC_KEY) || 0);
    return Date.now() - last > SYNC_INTERVAL_MS;
  } catch {
    return true;
  }
}

// Check if the user has activity since the given timestamp
async function hasActivitySince(uid, sinceMs) {
  if (!db || !uid) return false;
  const since = new Date(sinceMs);
  try {
    // Sessions
    const s = await getDocs(query(
      collection(db, "sessions"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(1),
    ));
    if (!s.empty) {
      const ts = s.docs[0].data().createdAt;
      const ms = ts?.toMillis?.() || 0;
      if (ms > sinceMs) return true;
    }
    // Learning patterns
    const lp = await getDocs(query(
      collection(db, "learningPatterns"),
      where("uid", "==", uid),
      limit(1),
    ));
    if (!lp.empty) {
      const ts = lp.docs[0].data().updatedAt;
      const ms = ts?.toMillis?.() || 0;
      if (ms > sinceMs) return true;
    }
  } catch (e) {
    console.warn("sync activity check:", e.message);
  }
  return false;
}

// Perform a smart sync: writes a sync marker doc (real Firestore write) so the
// admin dashboard can see the sync happened. Skips entirely if no activity.
export async function runSmartSync(uid, profile) {
  if (!db || !uid) return { synced: false, reason: "no-db" };
  let lastSyncMs = 0;
  try {
    lastSyncMs = Number(localStorage.getItem(SYNC_KEY) || 0);
  } catch { /* private mode */ }

  if (lastSyncMs && Date.now() - lastSyncMs < SYNC_INTERVAL_MS) {
    return { synced: false, reason: "too-soon" };
  }

  const active = lastSyncMs ? await hasActivitySince(uid, lastSyncMs) : true;
  if (!active) {
    // Update marker without counting as data sync (no activity to sync)
    try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch { /* ignore */ }
    return { synced: false, reason: "no-activity" };
  }

  try {
    await setDoc(doc(db, "syncMarkers", uid), {
      uid,
      email: profile?.email || "",
      schoolId: profile?.schoolId || null,
      lastSyncAt: serverTimestamp(),
      syncedAt: new Date().toISOString(),
    }, { merge: true });
    try { localStorage.setItem(SYNC_KEY, String(Date.now())); } catch { /* ignore */ }
    return { synced: true };
  } catch (e) {
    console.warn("sync write failed:", e.message);
    return { synced: false, reason: e.message };
  }
}

// Manual "sync now" from admin/management dashboard
export async function syncNow(uid, profile) {
  try { localStorage.removeItem(SYNC_KEY); } catch { /* ignore */ }
  return runSmartSync(uid, profile);
}
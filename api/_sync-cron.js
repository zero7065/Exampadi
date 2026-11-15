// api/cron/sync.js — Vercel daily cron: smart sync marker for active users.
// Only writes a sync marker for users with recent activity (smart, not blind).
// Runs once per day; skips users whose last sync was within 72h.
import { getFirebase } from "./_firebase.js";

export default async function handler(req, res) {
  const fb = getFirebase();
  if (!fb) return res.status(500).json({ error: "Backend unavailable" });

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.authorization || "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : (req.query?.key || "");
    if (provided !== secret) return res.status(401).json({ error: "Unauthorized" });
  }

  const now = Date.now();
  const THREE_DAYS = 72 * 60 * 60 * 1000;

  try {
    // Users active in the last 7 days (via sessions)
    const since = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const activeSnap = await fb.db.collection("sessions")
      .where("createdAt", ">=", since)
      .limit(500)
      .get();

    const activeUids = [...new Set(activeSnap.docs.map((d) => d.data()?.userId).filter(Boolean))];
    let synced = 0;
    let skipped = 0;

    for (const uid of activeUids) {
      const markerRef = fb.db.collection("syncMarkers").doc(uid);
      const marker = await markerRef.get();
      const lastMs = marker.exists
        ? (marker.data()?.lastSyncAt?.toMillis?.() || 0)
        : 0;
      if (lastMs && now - lastMs < THREE_DAYS) {
        skipped++;
        continue;
      }
      const userSnap = await fb.db.collection("users").doc(uid).get();
      const u = userSnap.exists ? userSnap.data() : {};
      await markerRef.set({
        uid,
        email: u.email || "",
        schoolId: u.schoolId || null,
        lastSyncAt: fb.admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: new Date().toISOString(),
      }, { merge: true });
      synced++;
    }

    return res.status(200).json({ ok: true, activeUsers: activeUids.length, synced, skipped });
  } catch (e) {
    console.error("sync cron failed:", e);
    return res.status(500).json({ error: e.message });
  }
}
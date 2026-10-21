// api/reminders.js — Vercel cron: deliver due reminders as notifications/push.
//
// Reminders are top-level docs ({ uid, title, body, dueAt, sent }). We avoid a
// composite index by querying unsent docs and filtering dueAt in memory.
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
  try {
    const snap = await fb.db.collection("reminders").where("sent", "==", false).limit(200).get();
    const due = snap.docs.filter((d) => {
      const v = d.data()?.dueAt;
      const ms = typeof v?.toMillis === "function" ? v.toMillis() : (v?.seconds ? v.seconds * 1000 : new Date(v || 0).getTime());
      return ms && ms <= now;
    }).slice(0, 80);

    let delivered = 0;
    for (const docSnap of due) {
      const r = docSnap.data() || {};
      if (!r.uid) continue;
      try {
        const claimed = await fb.db.runTransaction(async (tx) => {
          const fresh = await tx.get(docSnap.ref);
          if (!fresh.exists || fresh.data()?.sent) return false;
          tx.update(docSnap.ref, { sent: true, sentAt: fb.admin.firestore.FieldValue.serverTimestamp() });
          return true;
        });
        if (!claimed) continue;

        const title = String(r.title || "Study reminder").slice(0, 120);
        const body = String(r.body || "Time to study on ExamPadi.").slice(0, 500);
        const link = String(r.link || "/dashboard").slice(0, 500);
        const notifRef = fb.db.collection("notifications").doc(r.uid).collection("items").doc();
        await notifRef.set({
          type: "reminder",
          title,
          body,
          link,
          actorUid: r.uid,
          read: false,
          createdAt: fb.admin.firestore.FieldValue.serverTimestamp(),
        });

        try {
          const tokens = (await fb.db.collection("users").doc(r.uid).collection("pushTokens").limit(20).get())
            .docs.map((d) => d.data()?.token).filter(Boolean);
          if (tokens.length && fb.admin.messaging) {
            await fb.admin.messaging().sendEachForMulticast({
              tokens,
              notification: { title, body },
              data: { type: "reminder", link, id: notifRef.id },
              webpush: { fcmOptions: { link }, notification: { icon: "/icons/icon-192.png" } },
            });
          }
        } catch (e) {
          console.warn("[reminders] push skipped:", e?.message);
        }
        delivered += 1;
      } catch (e) {
        console.warn("[reminders] item failed:", e?.message);
      }
    }

    return res.status(200).json({ ok: true, due: due.length, delivered });
  } catch (e) {
    console.warn("[reminders] failed:", e?.message);
    return res.status(500).json({ error: "Reminder run failed" });
  }
}

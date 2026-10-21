// api/notify.js — one fan-out path for in-app notifications + web push.
//
// Clients never write notification docs directly (rules deny create), so a
// user cannot spam another user's inbox. This endpoint verifies the caller,
// rate-limits them, writes the notification, then sends FCM to every registered
// token. Push is best-effort: the in-app notification is still written when FCM
// is not configured.
import { requireUser, parseBody, cors, getProfile } from "./_auth.js";

const TYPES = new Set([
  "assignment", "submission", "reaction", "comment", "review_request",
  "review_remark", "announcement", "chat", "mention", "attention",
  "class_join", "school", "system", "reminder",
]);

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const auth = await requireUser(req, res, "Sign in to send a notification.");
  if (!auth) return;
  const { fb, uid } = auth;

  const body = parseBody(req);
  const toUid = String(body.toUid || "").trim().slice(0, 128);
  const type = TYPES.has(String(body.type)) ? String(body.type) : "system";
  const title = String(body.title || "ExamPadi").slice(0, 120);
  const message = String(body.body || "").slice(0, 500);
  const link = String(body.link || "").slice(0, 500);
  if (!toUid) return res.status(400).json({ error: { message: "Missing recipient." } });
  if (toUid === uid) {
    // Self-notifications are allowed (e.g. reminders) but skip the push.
  }

  try {
    // Rate limit: 40 notifications per sender per minute.
    const minute = Math.floor(Date.now() / 60000);
    const rateRef = fb.db.collection("notificationRate").doc(`${uid}_${minute}`);
    const allowed = await fb.db.runTransaction(async (tx) => {
      const snap = await tx.get(rateRef);
      const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
      if (count >= 40) return false;
      tx.set(rateRef, { uid, minute, count: count + 1, updatedAt: fb.admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });
    if (!allowed) return res.status(429).json({ error: { message: "Too many notifications — slow down." } });

    const recipient = await getProfile(fb, toUid);
    if (!recipient || !recipient.email) {
      // Still allow notifications for users whose profile write was delayed.
    }

    const notifRef = fb.db.collection("notifications").doc(toUid).collection("items").doc();
    await notifRef.set({
      type,
      title,
      body: message,
      link,
      actorUid: uid,
      actorName: String(body.actorName || "").slice(0, 80),
      read: false,
      createdAt: fb.admin.firestore.FieldValue.serverTimestamp(),
    });

    let pushSent = 0;
    let pushFailed = 0;
    try {
      const tokenSnap = await fb.db.collection("users").doc(toUid).collection("pushTokens").limit(20).get();
      const tokens = tokenSnap.docs.map((d) => d.data()?.token).filter(Boolean);
      if (tokens.length && fb.admin.messaging) {
        const result = await fb.admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title, body: message },
          data: { type, link, id: notifRef.id },
          webpush: {
            fcmOptions: { link: link || "/" },
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: notifRef.id,
            },
          },
        });
        pushSent = result.successCount || 0;
        pushFailed = result.failureCount || 0;
        // Remove tokens FCM says are permanently invalid.
        const stale = [];
        result.responses.forEach((r, i) => {
          const code = r.error?.code || "";
          if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
            stale.push(tokens[i]);
          }
        });
        await Promise.all(stale.map((token) => tokenSnap.docs.find((d) => d.data()?.token === token)?.ref.delete().catch(() => {})));
      }
    } catch (e) {
      console.warn("[notify] push skipped:", e?.message);
    }

    return res.status(200).json({ ok: true, id: notifRef.id, pushSent, pushFailed });
  } catch (e) {
    console.warn("[notify] failed:", e?.message);
    return res.status(500).json({ error: { message: "Could not send that notification." } });
  }
}

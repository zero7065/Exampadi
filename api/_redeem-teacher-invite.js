// api/redeem-teacher-invite.js — the only path that may grant the teacher role.
//
// The old client flow consumed the invite and then tried to update its own
// `role`, which firestore.rules correctly rejects (privilege escalation). The
// Admin SDK bypasses rules, so redemption is atomic here.
import { requireUser, parseBody, cors, timestampMillis } from "./_auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const auth = await requireUser(req, res, "Sign in to redeem a teacher invite.");
  if (!auth) return;
  const { fb, uid } = auth;

  const body = parseBody(req);
  const code = String(body.code || "").trim().toUpperCase().slice(0, 32);
  if (!code) return res.status(400).json({ error: { message: "Enter your invite code." } });

  try {
    const found = await fb.db.collection("teacherInvites").where("code", "==", code).limit(1).get();
    if (found.empty) return res.status(404).json({ error: { message: "Invalid invite code." } });
    const inviteRef = found.docs[0].ref;

    let result;
    await fb.db.runTransaction(async (tx) => {
      const snap = await tx.get(inviteRef);
      if (!snap.exists) throw new Error("Invalid invite code.");
      const inv = snap.data() || {};
      if (inv.used) throw new Error("This invite code has already been used.");
      if (timestampMillis(inv.expiresAt) && timestampMillis(inv.expiresAt) < Date.now()) {
        throw new Error("This invite code has expired.");
      }
      if (inv.schoolId) {
        const schoolSnap = await tx.get(fb.db.collection("schools").doc(String(inv.schoolId)));
        if (!schoolSnap.exists) throw new Error("The school for this invite no longer exists.");
        if (schoolSnap.data()?.status !== "approved") {
          throw new Error("That school is still awaiting approval.");
        }
      }
      tx.update(inviteRef, {
        used: true,
        usedBy: uid,
        usedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(fb.db.collection("users").doc(uid), {
        role: "teacher",
        schoolId: inv.schoolId || null,
        schoolName: inv.schoolName || null,
        teacherInviteId: inviteRef.id,
        updatedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      if (inv.schoolId) {
        tx.set(fb.db.collection("schools").doc(String(inv.schoolId)), {
          teacherIds: fb.admin.firestore.FieldValue.arrayUnion(uid),
        }, { merge: true });
      }
      result = { id: inviteRef.id, ...inv, used: true, usedBy: uid };
    });

    return res.status(200).json({ ok: true, invite: result });
  } catch (e) {
    console.warn("[redeem-teacher-invite] failed:", e?.message);
    return res.status(400).json({ error: { message: e?.message || "Could not redeem that invite." } });
  }
}

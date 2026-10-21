// api/class-invite.js — preview + join a class by code.
//
// classInvites are secrets: clients can no longer read the collection
// directly (that let anyone enumerate codes). This endpoint reads the invite
// and class with the Admin SDK, then adds the student server-side so the
// `classes.students` array can never be self-written.
import { requireUser, parseBody, cors, timestampMillis } from "./_auth.js";

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const auth = await requireUser(req, res, "Sign in to join a class.");
  if (!auth) return;
  const { fb, uid, decoded } = auth;

  const body = parseBody(req);
  const code = String(body.code || "").trim().toUpperCase().slice(0, 12);
  const action = body.action === "join" ? "join" : "preview";
  if (!code) return res.status(400).json({ error: { message: "Enter a class code." } });

  try {
    let inviteRef = fb.db.collection("classInvites").doc(code);
    let inviteSnap = await inviteRef.get();
    if (!inviteSnap.exists) {
      const found = await fb.db.collection("classInvites").where("code", "==", code).limit(1).get();
      if (found.empty) return res.status(404).json({ error: { message: "That class code was not found." } });
      inviteRef = found.docs[0].ref;
      inviteSnap = found.docs[0];
    }

    const invite = inviteSnap.data() || {};
    if (invite.status && invite.status !== "open") {
      return res.status(410).json({ error: { message: "This invite has been closed." } });
    }
    const expires = timestampMillis(invite.expiresAt);
    if (expires && expires < Date.now()) {
      return res.status(410).json({ error: { message: "This invite code has expired." } });
    }
    const usedBy = Array.isArray(invite.usedBy) ? invite.usedBy : [];
    const maxUses = Number(invite.maxUses || 0);
    if (maxUses && usedBy.length >= maxUses && !usedBy.includes(uid)) {
      return res.status(410).json({ error: { message: "This invite has reached its limit." } });
    }
    const emails = Array.isArray(invite.emails) ? invite.emails.map((e) => String(e).toLowerCase()) : [];
    const email = String(decoded.email || "").toLowerCase();
    if (emails.length && !emails.includes(email)) {
      return res.status(403).json({ error: { message: "This invite is for a different email address." } });
    }

    const classRef = fb.db.collection("classes").doc(String(invite.classId || ""));
    const classSnap = await classRef.get();
    if (!classSnap.exists) return res.status(404).json({ error: { message: "The class no longer exists." } });
    const cls = classSnap.data() || {};
    const already = Array.isArray(cls.students) && cls.students.includes(uid);

    if (action === "preview") {
      return res.status(200).json({
        ok: true,
        already,
        classId: classRef.id,
        schoolId: invite.schoolId || cls.schoolId || null,
        name: cls.name || "Class",
        subject: cls.subject || "",
        teacherName: cls.teacherName || invite.teacherName || "Teacher",
        studentCount: Array.isArray(cls.students) ? cls.students.length : 0,
      });
    }

    if (already) {
      return res.status(200).json({ ok: true, already: true, classId: classRef.id, schoolId: invite.schoolId || cls.schoolId || null });
    }

    await fb.db.runTransaction(async (tx) => {
      const freshInvite = await tx.get(inviteRef);
      if (!freshInvite.exists) throw new Error("Invite disappeared");
      const inv = freshInvite.data() || {};
      const used = Array.isArray(inv.usedBy) ? inv.usedBy : [];
      if (inv.status && inv.status !== "open") throw new Error("This invite has been closed.");
      if (Number(inv.maxUses || 0) && used.length >= Number(inv.maxUses) && !used.includes(uid)) {
        throw new Error("This invite has reached its limit.");
      }
      tx.update(classRef, {
        students: fb.admin.firestore.FieldValue.arrayUnion(uid),
      });
      if (!used.includes(uid)) {
        tx.update(inviteRef, {
          usedBy: fb.admin.firestore.FieldValue.arrayUnion(uid),
          lastUsedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      tx.set(fb.db.collection("users").doc(uid), {
        classIds: fb.admin.firestore.FieldValue.arrayUnion(classRef.id),
        schoolId: invite.schoolId || cls.schoolId || null,
        schoolName: cls.schoolName || invite.schoolName || null,
        className: cls.name || null,
        updatedAt: fb.admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return res.status(200).json({
      ok: true,
      already: false,
      classId: classRef.id,
      schoolId: invite.schoolId || cls.schoolId || null,
      name: cls.name || "Class",
      subject: cls.subject || "",
      teacherName: cls.teacherName || "Teacher",
    });
  } catch (e) {
    console.warn("[class-invite] failed:", e?.message);
    return res.status(500).json({ error: { message: e?.message || "Could not join that class." } });
  }
}

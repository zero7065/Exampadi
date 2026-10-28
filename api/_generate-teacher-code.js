// api/generate-teacher-code.js
// Generate an 8-character alphanumeric teacher code with seat cap and expiry.
// Stored in teacherCodes/{code} for transactional redemption.
import { getFirebase } from "./_firebase.js";
import { randomInt } from "node:crypto";

export const config = { runtime: "nodejs", maxDuration: 30 };

function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[randomInt(chars.length)];
  return code;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const fb = getFirebase();
  if (!fb) return res.status(500).json({ error: "Server not configured" });

  const token = req.headers.authorization?.replace("Bearer ", "").trim();
  if (!token) return res.status(401).json({ error: "AUTH_REQUIRED" });

  let uid;
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return res.status(401).json({ error: "AUTH_INVALID" });
  }

  const { orgId, teacherUid, seatCap = 20, expiresInDays = 30 } = req.body || {};
  const safeSeatCap = Math.max(1, Math.min(500, Math.floor(Number(seatCap) || 20)));
  const safeExpiryDays = Math.max(1, Math.min(365, Math.floor(Number(expiresInDays) || 30)));

  if (!orgId || !teacherUid) {
    return res.status(400).json({ error: "ORG_ID_AND_TEACHER_UID_REQUIRED" });
  }

  const userSnap = await fb.db.collection("users").doc(uid).get();
  if (!userSnap.exists) return res.status(403).json({ error: "FORBIDDEN" });
  const actor = userSnap.data();
  const isAdmin = actor.role === "admin";
  const actorOrgId = actor.orgId || actor.schoolId;
  if (!isAdmin && (teacherUid !== uid || actor.role !== "teacher" || actorOrgId !== orgId)) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const schoolSnap = await fb.db.collection("schools").doc(orgId).get();
  if (!schoolSnap.exists && !isAdmin) return res.status(404).json({ error: "ORG_NOT_FOUND" });

  const expiresAt = new Date(Date.now() + safeExpiryDays * 86400000);

  try {
    let code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = makeCode();
      const ref = fb.db.collection("teacherCodes").doc(candidate);
      try {
        await ref.create({
          code: candidate,
          orgId,
          teacherUid,
          seatCap: safeSeatCap,
          usedSeats: 0,
          expiresAt,
          status: "active",
          createdAt: new Date(),
          createdBy: uid,
        });
        code = candidate;
        break;
      } catch (error) {
        if (error.code !== 6 && error.code !== "already-exists") throw error;
      }
    }
    if (!code) return res.status(503).json({ error: "CODE_GENERATION_FAILED" });

    return res.status(200).json({ code, orgId, seatCap: safeSeatCap, expiresAt: expiresAt.toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Failed to create code" });
  }
}
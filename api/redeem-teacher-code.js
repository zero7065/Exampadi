// api/redeem-teacher-code.js
// Transactional school code redemption with seat cap enforcement.
// Errors: CODE_EXPIRED, SEATS_FULL, CODE_REVOKED, INVALID_CODE, ALREADY_REDEEMED
import { getFirebase } from "./_firebase.js";

export const config = { runtime: "nodejs", maxDuration: 30 };

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

  const { code } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "CODE_REQUIRED" });
  }

  const clean = String(code).trim().toUpperCase();

  try {
    await fb.db.runTransaction(async (transaction) => {
      const codeRef = fb.db.collection("teacherCodes").doc(clean);
      const codeSnap = await transaction.get(codeRef);

      if (!codeSnap.exists) {
        throw new Error("INVALID_CODE");
      }

      const data = codeSnap.data();
      if (data.status !== "active") {
        throw new Error("CODE_REVOKED");
      }

      // Check expiration
      if (data.expiresAt) {
        const exp = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
        if (exp <= new Date()) {
          throw new Error("CODE_EXPIRED");
        }
      }

      // Check seat cap
      if (data.usedSeats >= data.seatCap) {
        throw new Error("SEATS_FULL");
      }

      // Check if user already has an orgId (already redeemed a code)
      const userRef = fb.db.collection("users").doc(uid);
      const userSnap = await transaction.get(userRef);
      if (userSnap.exists && userSnap.data().orgId) {
        throw new Error("ALREADY_REDEEMED");
      }

      // Apply redemption
      transaction.update(codeRef, {
        usedSeats: data.usedSeats + 1,
        lastUsedAt: new Date(),
        lastUsedBy: uid,
      });

      transaction.update(userRef, {
        orgId: data.orgId,
        schoolId: data.orgId,
        role: "student",
        schoolCode: clean,
        updatedAt: new Date(),
      }, { merge: true });
    });

    return res.status(200).json({ ok: true, message: "School code redeemed successfully" });
  } catch (e) {
    const code = e.message;
    return res.status(400).json({ error: code });
  }
}
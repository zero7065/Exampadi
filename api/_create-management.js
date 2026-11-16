// api/_create-management.js — Admin creates a school management login.
// Management accounts can ONLY be created for an EXISTING, APPROVED school.
import { getFirebase } from "./_firebase.js";
import { parseBody, bearer } from "./_auth.js";

export default async function handler(req, res) {
  const fb = getFirebase();
  if (!fb) return res.status(500).json({ error: "Backend unavailable" });

  const token = bearer(req);
  if (!token) return res.status(401).json({ error: "Sign in required" });
  let decoded;
  try {
    decoded = await fb.admin.auth().verifyIdToken(token);
  } catch {
    return res.status(401).json({ error: "Your session expired — sign in again." });
  }

  // Caller must be an admin.
  const callerSnap = await fb.db.collection("users").doc(decoded.uid).get();
  const caller = callerSnap.exists ? callerSnap.data() : {};
  const adminUids = String(process.env.ADMIN_UIDS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const isAdmin =
    caller.role === "admin" ||
    decoded.email === "jadai7065@gmail.com" ||
    adminUids.includes(decoded.uid);
  if (!isAdmin) return res.status(403).json({ error: "Admin only" });

  const body = parseBody(req);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const schoolId = String(body.schoolId || "").trim();
  const displayName = String(body.name || "").trim();

  if (!email || !password || !schoolId) {
    return res.status(400).json({ error: "email, password and schoolId are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  // Management ONLY exists for a registered, approved school.
  const schoolSnap = await fb.db.collection("schools").doc(schoolId).get();
  if (!schoolSnap.exists) {
    return res.status(400).json({ error: "School not found — register the school first." });
  }
  const school = schoolSnap.data() || {};
  if (school.status !== "approved") {
    return res.status(400).json({ error: "Approve the school before creating a management login." });
  }

  const schoolName = school.name || school.schoolName || "";

  try {
    const rec = await fb.admin.auth().createUser({
      email,
      password,
      displayName: displayName || `${schoolName} Management`,
    });
    const uid = rec.uid;
    const name = displayName || `${schoolName || "School"} Management`;
    const ts = fb.admin.firestore.FieldValue.serverTimestamp();

    const batch = fb.db.batch();
    batch.set(fb.db.collection("users").doc(uid), {
      email, name, role: "management", accountType: "management",
      schoolId, schoolName, onboarded: true, createdAt: ts,
    }, { merge: true });
    batch.set(fb.db.collection("managementAccounts").doc(uid), {
      uid, email, name, schoolId, schoolName, active: true,
      createdBy: decoded.uid, createdAt: ts,
    }, { merge: true });
    await batch.commit();

    return res.status(201).json({ uid, email, password, schoolId, schoolName });
  } catch (err) {
    console.error("create-management error:", err.message);
    if (err.code === "auth/email-already-in-use") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return res.status(500).json({ error: "Failed to create management account" });
  }
}
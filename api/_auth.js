// api/_auth.js — shared CORS, body parsing and verified-user helpers.
import { getFirebase } from "./_firebase.js";

export function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS,GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

export function bearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null;
}

// Returns { fb, uid, decoded } or writes a 401/500 and returns null.
export async function requireUser(req, res, message = "Sign in to continue.") {
  const fb = getFirebase();
  if (!fb) {
    res.status(500).json({ error: { message: "Backend unavailable." } });
    return null;
  }
  const token = bearer(req);
  if (!token) {
    res.status(401).json({ error: { message }, code: "AUTH_REQUIRED" });
    return null;
  }
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    if (!decoded?.uid) throw new Error("no uid");
    return { fb, uid: decoded.uid, decoded };
  } catch {
    res.status(401).json({ error: { message: "Your session expired — sign in again." }, code: "AUTH_INVALID" });
    return null;
  }
}

export async function getProfile(fb, uid) {
  const snap = await fb.db.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : {};
}

export function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return new Date(value).getTime() || 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

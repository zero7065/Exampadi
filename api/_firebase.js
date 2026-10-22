// api/_firebase.js — cached Firebase Admin connection for serverless.
//
// Vercel keeps this module in memory across warm invocations, so we parse the
// service-account credentials and initialize the app ONCE per container instead
// of on every request. All server-side Firestore access goes through here.
import admin from "firebase-admin";

let cached = null;
let lastError = "not_configured";

function stripQuotes(value) {
  let text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1);
  }
  return text.trim();
}

function normalizePrivateKey(value) {
  return stripQuotes(value).replace(/\\r/g, "").replace(/\\n/g, "\n").trim();
}

function parseServiceAccountJson(raw) {
  let text = stripQuotes(raw);
  if (!text) return null;

  if (!text.startsWith("{")) {
    try {
      const decoded = Buffer.from(text, "base64").toString("utf8").trim();
      if (decoded.startsWith("{")) text = decoded;
    } catch {
      return null;
    }
  }
  if (!text.startsWith("{")) return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Some dashboards turn escaped newlines inside private_key into real
    // newlines, which makes the JSON invalid. Repair only that field.
    const repaired = text.replace(
      /("private_key"\s*:\s*")([\s\S]*?)(")/,
      (_, before, key, after) => before + key.replace(/\r?\n/g, "\\n") + after
    );
    parsed = JSON.parse(repaired);
  }

  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.private_key) parsed.private_key = normalizePrivateKey(parsed.private_key);
  return parsed;
}

function credentialsFromParts() {
  const projectId = stripQuotes(process.env.FIREBASE_PROJECT_ID);
  const clientEmail = stripQuotes(process.env.FIREBASE_CLIENT_EMAIL);
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) return null;
  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function readCredentials() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const parsed = parseServiceAccountJson(raw);
      if (parsed?.project_id && parsed?.client_email && parsed?.private_key) return parsed;
      lastError = "invalid_json";
    } catch {
      lastError = "invalid_json";
    }
  }

  const parts = credentialsFromParts();
  if (parts) return parts;

  lastError = raw ? "invalid_json" : "not_configured";
  return null;
}

function ensureFirebase() {
  if (cached) return cached;

  const credentials = readCredentials();
  if (!credentials) return null;

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
        projectId: credentials.project_id,
      });
    }
    cached = { admin, db: admin.firestore() };
    lastError = "ready";
    return cached;
  } catch (e) {
    lastError = "init_failed";
    console.error("[firebase] init failed:", e?.message);
    // Never cache a failed init — the next request retries.
    return null;
  }
}

// Returns { admin, db } or null when the service account is missing or invalid.
export function getFirebase() {
  return ensureFirebase();
}

// Safe diagnostics for /api/health. Never returns key material.
export function getFirebaseDiagnostics() {
  const configured = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  );
  const fb = ensureFirebase();
  return {
    configured,
    ready: Boolean(fb),
    reason: fb ? "ready" : lastError,
  };
}

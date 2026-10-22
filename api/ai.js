// api/ai.js — Groq proxy. GROQ_API_KEY lives ONLY in server env.
//
// Why this exists: import.meta.env.VITE_GROQ_API_KEY is inlined into the
// public JS bundle by Vite, so every visitor could read the key. The client
// now POSTs here with a Firebase ID token instead. This endpoint verifies
// the token, enforces the AI credit limit server-side (the client gate is
// UX only — never the authority), forwards to Groq, then books usage.

import { aiLimitsFor } from "../src/config/plans.js";
import { getFirebase } from "./_firebase.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// OpenAI doesn't host Groq's qwen/gpt-oss/allam models — map to nearest OpenAI equivalent.
const OPENAI_MODEL_MAP = new Map([
  ["qwen/qwen3.8-27b", "gpt-4o-mini"],
  ["openai/gpt-oss-120b", "gpt-4o"],
  ["openai/gpt-oss-20b", "gpt-4o-mini"],
  ["allam-2-7b", "gpt-4o-mini"],
]);

function openaiModelFor(model) {
  return OPENAI_MODEL_MAP.get(model) || "gpt-4o-mini";
}

// Must match MODELS in src/lib/ai.js and VISION_MODEL in src/lib/vision.js.
// Allowlist, never a passthrough — otherwise this becomes an open proxy.
const ALLOWED_MODELS = new Set([
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
]);

const MAX_TOKENS = 8000;
const MAX_BODY_CHARS = 3_000_000; // vision payloads carry base64 images
const WAT_OFFSET_MS = 60 * 60 * 1000; // Africa/Lagos = UTC+1
const PRO_PLAN_IDS = new Set(["pro_monthly", "pro_yearly", "ielts", "team_monthly", "team_yearly"]);

function dayKey(now) {
  return new Date(now.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}
function monthKey(now) {
  return new Date(now.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 7);
}

// Mirror of usageTracker's limit logic. Returns { allowed, ... } and never
// throws — a broken counter must not brick the AI tutor for paid students.
// dayFresh/monthFresh tell the writer whether to reset or increment.
function limitState(data, now) {
  try {
    const sub = data?.subscription;
    const planId = sub?.status === "active" && PRO_PLAN_IDS.has(sub.plan) ? sub.plan : "free";
    const limits = aiLimitsFor(planId);
    const isFree = planId === "free";
    const day = dayKey(now);
    const month = monthKey(now);
    const dayFresh = data?.lastAIDay === day;
    const monthFresh = data?.aiMonth === month;
    const usedToday = dayFresh ? Number(data?.aiMessagesDay || 0) : 0;
    const monthUsed = monthFresh ? Number(data?.aiMessagesMonth || 0) : 0;
    const pack = Number(data?.aiPackCredits || 0);
    const dailyCap = isFree ? (limits.perDay || 3) : (limits.dailyCap || Infinity);
    const monthLimit = isFree ? 0 : (limits.perMonth || Infinity);
    const baseReached = isFree ? usedToday >= dailyCap : monthUsed >= monthLimit;
    return {
      allowed: !(baseReached && pack <= 0),
      planId, isFree, day, month, dayFresh, monthFresh,
      usedToday, monthUsed, pack, dailyCap, monthLimit, limits,
    };
  } catch (e) {
    console.warn("[ai] limitState failed (fail-open):", e?.message);
    return { allowed: true, planId: "free", isFree: true, day: dayKey(now), month: monthKey(now), dayFresh: false, monthFresh: false, usedToday: 0, monthUsed: 0, pack: 0, dailyCap: 3, monthLimit: 0, limits: null };
  }
}

// Single write booking a successful message: day/month counters (reset on
// roll) + pack drain only past the base allowance + cost-monitoring log.
async function bookUsage(db, adminLib, uid, state, { model, tokens, source }) {
  try {
    const inc = adminLib.firestore.FieldValue.increment;
    const update = {};

    if (state.dayFresh) update.aiMessagesDay = inc(1);
    else { update.lastAIDay = state.day; update.aiMessagesDay = 1; }

    if (state.monthFresh) update.aiMessagesMonth = inc(1);
    else { update.aiMonth = state.month; update.aiMessagesMonth = 1; }

    // Pack credits are a bonus pool, drained only past the base allowance.
    const overBase = state.isFree
      ? state.usedToday >= (state.limits?.perDay || 3)
      : state.monthUsed >= (state.limits?.perMonth || Infinity);
    if (overBase && state.pack > 0) update.aiPackCredits = inc(-1);

    await db.collection("users").doc(uid).set(update, { merge: true });
    await db.collection("aiUsageLog").add({
      userId: uid,
      plan: state.planId,
      model: model || null,
      tokens: tokens ?? null,
      source: source || "ai",
      createdAt: adminLib.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
  } catch (e) {
    // Booking must never fail the response the student is waiting on.
    console.warn("[ai] bookUsage failed:", e?.message);
  }
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const key = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!key && !openaiKey) {
    return res.status(500).json({
      error: {
        message: "AI is not configured on the server — set GROQ_API_KEY and/or OPENAI_API_KEY in Vercel.",
      },
      code: "NO_AI_KEY",
    });
  }

  const fb = getFirebase();
  if (!fb) {
    return res.status(500).json({
      error: {
        message: "Server auth is not configured — add FIREBASE_SERVICE_ACCOUNT in Vercel, or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY. Generate the key in Firebase Console → Project settings → Service accounts.",
      },
      code: "NO_SERVICE_ACCOUNT",
    });
  }

  // ── Auth: a verified Firebase ID token is required. Without this the
  //    endpoint would be an open Groq relay for anyone who finds it.
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: { message: "Sign in to use the AI tutor." }, code: "AUTH_REQUIRED" });
  }

  let uid;
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    uid = decoded?.uid;
    if (!uid) throw new Error("no uid");
  } catch {
    return res.status(401).json({ error: { message: "Your session expired — sign in again to use the AI tutor." }, code: "AUTH_INVALID" });
  }

  // ── Payload validation
  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: { message: "Invalid request body." } });
  }
  const model = String(body.model || "");
  if (!ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: { message: "Unknown model." }, code: "BAD_MODEL" });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 80) {
    return res.status(400).json({ error: { message: "Invalid messages." } });
  }
  if (JSON.stringify(body).length > MAX_BODY_CHARS) {
    return res.status(413).json({ error: { message: "Request too large." } });
  }
  const maxTokens = Math.max(1, Math.min(MAX_TOKENS, Number(body.max_tokens) || 600));
  const temperature = Math.max(0, Math.min(2, Number(body.temperature) || 0.5));

  // ── Server-side credit gate (authoritative; client gate is UX only)
  const now = new Date();
  let state;
  try {
    const snap = await fb.db.collection("users").doc(uid).get();
    state = limitState(snap.exists ? snap.data() : null, now);
  } catch (e) {
    console.warn("[ai] user read failed (fail-open):", e?.message);
    state = limitState(null, now); // anonymous-style default → allowed
    state.allowed = true;
  }
  if (!state.allowed) {
    return res.status(402).json({
      error: {
        message: state.isFree
          ? "You have used all your free AI messages for today. Upgrade or buy a 50-message pack to continue."
          : `You have used all ${state.monthLimit} AI messages for this month. Upgrade or buy a 50-message pack to continue.`,
      },
      code: "AI_LIMIT",
      info: { plan: state.planId, monthLimit: state.monthLimit, monthUsed: state.monthUsed, dailyCap: state.dailyCap, usedToday: state.usedToday, packRemaining: state.pack },
    });
  }

  // ── Forward to Groq (primary), fall back to OpenAI
  async function fetchProvider(url, authKey, model, messages, maxTokens, temperature) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const json = await res.json().catch(() => null);
    return { res, json, ok: res.ok && !!json };
  }

  let upstream;
  let data;

  // 1) Try Groq first (skipped entirely when only OpenAI is configured)
  if (key) {
    try {
      const result = await fetchProvider(GROQ_URL, key, model, body.messages, maxTokens, temperature);
      upstream = result.res;
      data = result.json;
    } catch {
      // Groq network error — fall through to OpenAI fallback
      upstream = null;
      data = null;
    }
  }

  // 2) If Groq failed (network, 5xx, or invalid response), try OpenAI fallback
  if (!upstream?.ok || !data) {
    if (!openaiKey) {
      const msg = data?.error?.message || "AI is unavailable right now — try again shortly.";
      return res.status(502).json({ error: { message: msg } });
    }
    try {
      const result = await fetchProvider(OPENAI_URL, openaiKey, openaiModelFor(model), body.messages, maxTokens, temperature);
      upstream = result.res;
      data = result.json;
    } catch {
      return res.status(502).json({ error: { message: "AI services unreachable — try again shortly." } });
    }
  }

  if (!upstream.ok || !data) {
    const msg = data?.error?.message || `AI error (${upstream.status})`;
    // Pass through 4xx so the client can show the real reason; never 5xx-fake.
    return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: { message: msg } });
  }

  // ── Success: book the message BEFORE responding so the next call sees it.
  await bookUsage(fb.db, fb.admin, uid, state, {
    model: data.model || model,
    tokens: data.usage?.total_tokens ?? null,
    source: String(body.source || "ai").slice(0, 40),
  });

  return res.status(200).json(data);
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

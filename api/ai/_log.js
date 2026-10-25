import crypto from "node:crypto";

const SALT = process.env.LOG_SALT || "exampadi-salt-v1";
const WAT_OFFSET_MS = 60 * 60 * 1000;
const MAX_PREVIEW = 120;

export function hashUid(uid) {
  return crypto.createHash("sha256").update(`${SALT}${uid || ""}`).digest("hex").slice(0, 24);
}

export function scrub(text = "") {
  return String(text || "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/\+?\d[\d\s-]{8,}\d/g, "[phone]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PREVIEW);
}

export function dateKeys(now = new Date()) {
  const wat = new Date(now.getTime() + WAT_OFFSET_MS);
  return {
    dateKey: wat.toISOString().slice(0, 10),
    monthKey: wat.toISOString().slice(0, 7),
  };
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  );
}

function isAlreadyExists(error) {
  return error?.code === 6
    || error?.code === "already-exists"
    || /already exists/i.test(String(error?.message || ""));
}

export async function logRequest(db, adminLib, entry = {}) {
  try {
    const fieldValue = adminLib?.firestore?.FieldValue;
    if (!fieldValue) return null;
    const now = new Date();
    const hashedUid = hashUid(entry.uid);
    const { dateKey, monthKey } = dateKeys(now);
    const intent = String(entry.intent || "chat").slice(0, 32);
    const provider = String(entry.providerUsed || "none").slice(0, 32);

    const doc = compact({
      uid: hashedUid,
      sessionId: entry.sessionId ? String(entry.sessionId).slice(0, 80) : null,
      requestId: entry.requestId ? String(entry.requestId).slice(0, 100) : null,
      intent,
      intentConfidence: Number(entry.intentConfidence) || 0,
      subjectHint: entry.subjectHint ? String(entry.subjectHint).slice(0, 80) : null,
      detectedSubject: entry.detectedSubject ? String(entry.detectedSubject).slice(0, 80) : null,
      promptHash: entry.promptHash || null,
      promptPreview: scrub(entry.promptPreview),
      promptTokens: Number(entry.promptTokens) || 0,
      hasImage: Boolean(entry.hasImage),
      imageBytes: Number(entry.imageBytes) || 0,
      providerTried: Array.isArray(entry.providerTried) ? entry.providerTried.slice(0, 8) : [],
      providerUsed: entry.providerUsed || null,
      modelUsed: entry.modelUsed || null,
      fallbackReason: entry.fallbackReason || null,
      responsePreview: scrub(entry.responsePreview),
      responseTokens: Number(entry.responseTokens) || 0,
      totalTokens: Number(entry.totalTokens) || 0,
      responseCached: Boolean(entry.responseCached),
      latencyMs: Number(entry.latencyMs) || 0,
      statusCode: Number(entry.statusCode) || 200,
      costUsd: Number(entry.costUsd) || 0,
      costNgn: Number(entry.costNgn) || 0,
      ngnUsdRate: Number(entry.ngnUsdRate) || 1530,
      outcome: entry.outcome || "success",
      errorCode: entry.errorCode || null,
      errorMessage: entry.errorMessage ? scrub(entry.errorMessage) : null,
      planAtRequest: entry.planAtRequest || "free",
      aiMessagesUsedToday: Number(entry.aiMessagesUsedToday) || 0,
      aiMessagesUsedMonth: Number(entry.aiMessagesUsedMonth) || 0,
      creditRemaining: Number(entry.creditRemaining) || 0,
      gatewayVersion: "2.0.0",
      schemaVersion: 1,
      createdAt: fieldValue.serverTimestamp(),
      dateKey,
      monthKey,
    });

    const ref = await db.collection("aiLogs").add(doc);
    const rollupRef = db.collection("aiLogsDaily").doc(dateKey)
      .collection("rollups").doc(hashedUid);

    const initial = {
      uid: hashedUid,
      dateKey,
      monthKey,
      requests: 1,
      totalTokens: doc.totalTokens,
      totalCostUsd: doc.costUsd,
      totalCostNgn: doc.costNgn,
      errors: doc.outcome === "error" ? 1 : 0,
      rateLimited: doc.outcome === "rate_limited" ? 1 : 0,
      creditDenied: doc.outcome === "credit_denied" ? 1 : 0,
      fallbacks: doc.outcome === "fallback_success" ? 1 : 0,
      cacheHits: doc.responseCached ? 1 : 0,
      byIntent: { [intent]: 1 },
      byProvider: { [provider]: 1 },
      firstRequestAt: fieldValue.serverTimestamp(),
      lastRequestAt: fieldValue.serverTimestamp(),
    };

    try {
      await rollupRef.create(initial);
    } catch (error) {
      if (!isAlreadyExists(error)) throw error;
      await rollupRef.set({
        requests: fieldValue.increment(1),
        totalTokens: fieldValue.increment(doc.totalTokens),
        totalCostUsd: fieldValue.increment(doc.costUsd),
        totalCostNgn: fieldValue.increment(doc.costNgn),
        errors: fieldValue.increment(doc.outcome === "error" ? 1 : 0),
        rateLimited: fieldValue.increment(doc.outcome === "rate_limited" ? 1 : 0),
        creditDenied: fieldValue.increment(doc.outcome === "credit_denied" ? 1 : 0),
        fallbacks: fieldValue.increment(doc.outcome === "fallback_success" ? 1 : 0),
        cacheHits: fieldValue.increment(doc.responseCached ? 1 : 0),
        [`byIntent.${intent}`]: fieldValue.increment(1),
        [`byProvider.${provider}`]: fieldValue.increment(1),
        lastRequestAt: fieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return ref.id;
  } catch (error) {
    console.warn("[ai/log] write failed:", error?.message);
    return null;
  }
}

import crypto from "node:crypto";
import { getFirebase } from "../_firebase.js";
import { classifyIntent, detectSubject, messagesHaveImage, messagesText, previewForMessages } from "./_classify.js";
import { availableRouteFor, planTier } from "./_router.js";
import { callProvider } from "./_providers.js";
import { checkCache, writeCache } from "./_cache.js";
import { dateKeys, hashUid, logRequest } from "./_log.js";
import { bookUsage, limitState } from "./_usage.js";
import { checkCostCeiling } from "./_guardrails.js";

const GATEWAY_VERSION = "2.0.0";
const MAX_TOKENS = 8000;
const MAX_BODY_CHARS = 3_000_000;
const NGN_USD_RATE = Number(process.env.NGN_USD_RATE) || 1530;

const COST_RATES = {
  "groq:openai/gpt-oss-120b": [0.00015, 0.0006],
  "groq:openai/gpt-oss-20b": [0.000075, 0.0003],
  "groq:qwen/qwen3.8-27b": [0.00029, 0.00059],
  "groq:allam-2-7b": [0.0001, 0.0004],
  "openai:gpt-4o": [0.0025, 0.01],
  "openai:gpt-4o-mini": [0.00015, 0.0006],
  "gemini:gemini-2.5-flash": [0.000075, 0.0003],
  "gemini:gemini-2.0-flash": [0.000075, 0.0003],
  "gemini:gemini-1.5-flash": [0.000075, 0.0003],
};

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-Id");
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function responseText(response) {
  return response?.choices?.[0]?.message?.content || "";
}

function usageOf(response) {
  const usage = response?.usage || {};
  return {
    promptTokens: Number(usage.prompt_tokens || usage.promptTokenCount || 0) || 0,
    responseTokens: Number(usage.completion_tokens || usage.candidatesTokenCount || 0) || 0,
    totalTokens: Number(usage.total_tokens || usage.totalTokenCount || 0) || 0,
  };
}

function imageBytes(messages, bodyImage) {
  let bytes = 0;
  for (const message of messages) {
    if (!Array.isArray(message?.content)) continue;
    for (const part of message.content) {
      const value = part?.image_url?.url || part?.image?.url || part?.data || part?.inlineData?.data || part?.inline_data?.data;
      if (typeof value === "string" && value.startsWith("data:")) {
        const base64 = value.split(",", 2)[1] || "";
        bytes += Math.floor((base64.length * 3) / 4);
      }
    }
  }
  if (typeof bodyImage === "string" && bodyImage.startsWith("data:")) {
    const base64 = bodyImage.split(",", 2)[1] || "";
    bytes += Math.floor((base64.length * 3) / 4);
  }
  return bytes;
}

function estimateCost(provider, model, usage) {
  const [inputRate, outputRate] = COST_RATES[`${provider}:${model}`] || [0.0001, 0.0004];
  const costUsd = ((usage.promptTokens * inputRate) + (usage.responseTokens * outputRate)) / 1000;
  return {
    costUsd: Number(costUsd.toFixed(8)),
    costNgn: Number((costUsd * NGN_USD_RATE).toFixed(4)),
  };
}

function requestIdFor(body) {
  return body?.requestId
    ? String(body.requestId).slice(0, 100)
    : `req_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function promptHashFor(intent, subject, messages, hasImage) {
  return crypto.createHash("sha256")
    .update(`${intent}|${subject || ""}|${JSON.stringify(messages)}|${hasImage ? "image" : "text"}`)
    .digest("hex");
}

function errorPayload(message, code, extra = {}) {
  return { error: { message, code }, code, ...extra };
}

export async function handleAIRequest(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json(errorPayload("Method not allowed", "METHOD_NOT_ALLOWED"));

  const hasProviderKey = Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasProviderKey) {
    return res.status(500).json(errorPayload(
      "AI is not configured on the server. Add GROQ_API_KEY, OPENAI_API_KEY and/or GEMINI_API_KEY in Vercel.",
      "NO_AI_KEY",
    ));
  }

  const fb = getFirebase();
  if (!fb) {
    return res.status(500).json(errorPayload(
      "Server auth is not configured. Add FIREBASE_SERVICE_ACCOUNT or the FIREBASE_* service-account fields in Vercel.",
      "NO_SERVICE_ACCOUNT",
    ));
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json(errorPayload("Sign in to use the AI tutor.", "AUTH_REQUIRED"));
  }

  let uid;
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    uid = decoded?.uid;
    if (!uid) throw new Error("No uid");
  } catch {
    return res.status(401).json(errorPayload("Your session expired. Sign in again to use the AI tutor.", "AUTH_INVALID"));
  }

  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
  if (rawBody.length > MAX_BODY_CHARS) {
    return res.status(413).json(errorPayload("Request too large.", "PAYLOAD_TOO_LARGE"));
  }

  const body = typeof req.body === "string" ? safeParse(req.body) : (req.body || {});
  if (!body || typeof body !== "object") {
    return res.status(400).json(errorPayload("Invalid request body.", "BAD_BODY"));
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0 || messages.length > 80) {
    return res.status(400).json(errorPayload("Invalid messages.", "BAD_MESSAGES"));
  }

  const hasImage = Boolean(body.image || body.imageBase64) || messagesHaveImage(messages);
  const intentHint = body.intent_hint || body.intent || null;
  const { intent, confidence } = classifyIntent({ messages, hasImage, intentHint });
  const text = messagesText(messages);
  const subjectHint = body.subject ? String(body.subject).slice(0, 80) : null;
  const detectedSubject = subjectHint || detectSubject(text);
  const requestId = requestIdFor(body);
  const sessionId = body.sessionId
    ? String(body.sessionId).slice(0, 80)
    : req.headers["x-session-id"] ? String(req.headers["x-session-id"]).slice(0, 80) : null;
  const maxTokens = Math.max(1, Math.min(MAX_TOKENS, Number(body.max_tokens) || 1200));
  const temperature = Math.max(0, Math.min(2, Number(body.temperature) || 0.5));
  const source = String(body.source || "ai").slice(0, 40);
  const imageCountBytes = imageBytes(messages, body.image || body.imageBase64 || null);

  const userSnap = await fb.db.collection("users").doc(uid).get().catch(() => null);
  const user = userSnap?.exists ? userSnap.data() : {};
  const state = limitState(user);
  if (!state.allowed) {
    const message = state.isFree
      ? "You have used all your free AI messages for today. Upgrade or buy a 50-message pack to continue."
      : `You have used all ${state.monthLimit} AI messages for this month. Upgrade or buy a 50-message pack to continue.`;
    void logRequest(fb.db, fb.admin, {
      uid,
      sessionId,
      requestId,
      intent,
      intentConfidence: confidence,
      subjectHint,
      detectedSubject,
      hasImage,
      imageBytes: imageCountBytes,
      providerTried: [],
      providerUsed: null,
      outcome: "credit_denied",
      errorCode: "AI_LIMIT",
      errorMessage: message,
      statusCode: 402,
      planAtRequest: state.planId,
      aiMessagesUsedToday: state.usedToday,
      aiMessagesUsedMonth: state.monthUsed,
      creditRemaining: state.pack,
    });
    return res.status(402).json(errorPayload(message, "AI_LIMIT", {
      info: {
        plan: state.planId,
        monthLimit: state.monthLimit,
        monthUsed: state.monthUsed,
        dailyCap: state.dailyCap,
        usedToday: state.usedToday,
        packRemaining: state.pack,
      },
    }));
  }

  const { dateKey } = dateKeys();
  const rollupSnap = await fb.db.collection("aiLogsDaily").doc(dateKey)
    .collection("rollups").doc(hashUid(uid)).get().catch(() => null);
  const costGuard = checkCostCeiling(rollupSnap?.exists ? rollupSnap.data() : null, state.planId);
  if (!costGuard.allowed) {
    const message = "This account has reached its daily AI cost safety limit. Try again tomorrow or contact support.";
    void logRequest(fb.db, fb.admin, {
      uid,
      sessionId,
      requestId,
      intent,
      intentConfidence: confidence,
      subjectHint,
      detectedSubject,
      hasImage,
      imageBytes: imageCountBytes,
      providerTried: [],
      providerUsed: null,
      outcome: "credit_denied",
      errorCode: "AI_COST_LIMIT",
      errorMessage: message,
      statusCode: 402,
      planAtRequest: state.planId,
      aiMessagesUsedToday: state.usedToday,
      aiMessagesUsedMonth: state.monthUsed,
      creditRemaining: state.pack,
    });
    return res.status(402).json(errorPayload(message, "AI_COST_LIMIT", {
      info: { plan: state.planId, ...costGuard },
    }));
  }

  const promptHash = promptHashFor(intent, detectedSubject, messages, hasImage);
  const promptPreview = previewForMessages(messages);
  const startedAt = Date.now();

  if (!hasImage) {
    const cached = await checkCache(fb.db, promptHash);
    if (cached) {
      const usage = usageOf(cached.response);
      const booked = await bookUsage(fb.db, fb.admin, uid, state, {
        model: cached.modelUsed || null,
        tokens: usage.totalTokens,
        source,
        intent,
      });
      void logRequest(fb.db, fb.admin, {
        uid,
        sessionId,
        requestId,
        intent,
        intentConfidence: confidence,
        subjectHint,
        detectedSubject,
        promptHash,
        promptPreview,
        promptTokens: usage.promptTokens,
        hasImage,
        providerTried: ["cache"],
        providerUsed: "cache",
        modelUsed: cached.modelUsed || null,
        responsePreview: responseText(cached.response),
        responseTokens: usage.responseTokens,
        totalTokens: usage.totalTokens,
        responseCached: true,
        latencyMs: Date.now() - startedAt,
        statusCode: 200,
        outcome: "success",
        planAtRequest: state.planId,
        aiMessagesUsedToday: booked.usedToday,
        aiMessagesUsedMonth: booked.monthUsed,
        creditRemaining: booked.creditRemaining,
      });
      res.setHeader("X-Exampadi-Cache", "HIT");
      res.setHeader("X-Exampadi-Intent", intent);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(cached.response);
    }
  }

  const chain = availableRouteFor(intent, planTier(state.planId));
  if (chain.length === 0) {
    void logRequest(fb.db, fb.admin, {
      uid,
      sessionId,
      requestId,
      intent,
      intentConfidence: confidence,
      subjectHint,
      detectedSubject,
      promptHash,
      promptPreview,
      hasImage,
      providerTried: [],
      outcome: "error",
      errorCode: "NO_PROVIDER",
      errorMessage: "No configured AI provider can handle this request.",
      statusCode: 503,
      planAtRequest: state.planId,
      aiMessagesUsedToday: state.usedToday,
      aiMessagesUsedMonth: state.monthUsed,
      creditRemaining: state.pack,
    });
    return res.status(503).json(errorPayload(
      intent === "vision"
        ? "Image review is unavailable right now. Check GEMINI_API_KEY or try a text question."
        : "AI is unavailable right now. Try again shortly.",
      "NO_PROVIDER",
    ));
  }

  const providerTried = [];
  let result = null;
  let fallbackReason = null;
  const providerImage = hasImage && !messagesHaveImage(messages)
    ? (body.image || body.imageBase64 || null)
    : null;
  const deadline = startedAt + (hasImage ? 50_000 : 52_000);

  for (const step of chain) {
    const remaining = deadline - Date.now();
    if (remaining < 3_000) {
      fallbackReason = "request_deadline";
      break;
    }
    providerTried.push(step.p);
    try {
      result = await callProvider(step.p, step.m, {
        messages,
        image: providerImage,
        maxTokens,
        temperature,
        timeoutMs: Math.min(hasImage ? 50_000 : 40_000, remaining),
      });
      if (result?.ok) break;
      fallbackReason = result?.error?.code || `${step.p}_failed`;
    } catch (error) {
      fallbackReason = `${step.p}_${error?.code || "error"}`;
      result = { ok: false, error: { message: error?.message || "Provider failed" } };
    }
  }

  const latencyMs = Date.now() - startedAt;

  if (!result?.ok) {
    void logRequest(fb.db, fb.admin, {
      uid,
      sessionId,
      requestId,
      intent,
      intentConfidence: confidence,
      subjectHint,
      detectedSubject,
      promptHash,
      promptPreview,
      hasImage,
      imageBytes: imageCountBytes,
      providerTried,
      providerUsed: result?.provider || null,
      modelUsed: result?.model || null,
      fallbackReason,
      latencyMs,
      statusCode: 502,
      outcome: /429/.test(String(fallbackReason)) ? "rate_limited" : "error",
      errorCode: fallbackReason,
      errorMessage: result?.error?.message || null,
      planAtRequest: state.planId,
      aiMessagesUsedToday: state.usedToday,
      aiMessagesUsedMonth: state.monthUsed,
      creditRemaining: state.pack,
    });
    return res.status(502).json(errorPayload(
      "AI is unavailable right now. Try again shortly.",
      "ALL_PROVIDERS_FAILED",
    ));
  }

  const usage = usageOf(result.response);
  const booked = await bookUsage(fb.db, fb.admin, uid, state, {
    model: result.model,
    tokens: usage.totalTokens,
    source,
    intent,
  });
  const cost = estimateCost(result.provider, result.model, usage);

  if (!hasImage) {
    void writeCache(fb.db, promptHash, {
      promptPreview,
      response: result.response,
      modelUsed: result.model,
      provider: result.provider,
    });
  }

  void logRequest(fb.db, fb.admin, {
    uid,
    sessionId,
    requestId,
    intent,
    intentConfidence: confidence,
    subjectHint,
    detectedSubject,
    promptHash,
    promptPreview,
    promptTokens: usage.promptTokens,
    hasImage,
    imageBytes: imageCountBytes,
    providerTried,
    providerUsed: result.provider,
    modelUsed: result.model,
    fallbackReason: fallbackReason || null,
    responsePreview: responseText(result.response),
    responseTokens: usage.responseTokens,
    totalTokens: usage.totalTokens,
    responseCached: false,
    latencyMs,
    statusCode: 200,
    costUsd: cost.costUsd,
    costNgn: cost.costNgn,
    ngnUsdRate: NGN_USD_RATE,
    outcome: fallbackReason ? "fallback_success" : "success",
    planAtRequest: state.planId,
    aiMessagesUsedToday: booked.usedToday,
    aiMessagesUsedMonth: booked.monthUsed,
    creditRemaining: booked.creditRemaining,
  });

  res.setHeader("X-Exampadi-Cache", "MISS");
  res.setHeader("X-Exampadi-Provider", result.provider);
  res.setHeader("X-Exampadi-Model", result.model);
  res.setHeader("X-Exampadi-Intent", intent);
  res.setHeader("X-Exampadi-Gateway", GATEWAY_VERSION);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(result.response);
}

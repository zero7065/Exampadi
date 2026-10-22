// src/lib/ai.js - Unified Groq AI client.
//
// All model calls go through our own server proxy (POST /api/ai). The Groq
// key lives only in the server env (GROQ_API_KEY) — Vite inlines any
// VITE_-prefixed var into the public bundle, so it must never carry a secret.

import { logTrainingEntry } from "./aiTraining";
import { auth } from "../firebaseConfig";
import { checkAILimit } from "./usageTracker";

// Thrown when the user has no AI credits left. Consumers can catch this to
// show the upgrade/pack modal instead of a generic error.
export class AILimitError extends Error {
  constructor(message, info = {}) {
    super(message);
    this.name = "AILimitError";
    this.code = "AI_LIMIT";
    this.info = info;
  }
}

// Central gate — run before every Groq call. Throws AILimitError when the
// user is hard-stopped (monthly cap + no pack credits). Fires a soft-warning
// event at 80% of the monthly cap. Fail-open: anonymous users and Firestore
// errors never block the AI call.
async function enforceAILimit(source) {
  const uid = auth?.currentUser?.uid;
  if (!uid) return { allowed: true };
  let check;
  try {
    check = await checkAILimit(uid);
  } catch {
    return { allowed: true };
  }
  if (!check.allowed) {
    throw new AILimitError(
      check.isFree
        ? "You've used all 3 free AI messages for today. Upgrade to Pro or buy a 50-message pack (₦1,500) to continue."
        : `You've used all ${check.monthLimit} AI messages for this month. Upgrade to Pro or buy a 50-message pack (₦1,500) to continue.`,
      { ...check, source }
    );
  }
  if (check.softWarning && typeof window !== "undefined") {
    try {
      const now = Date.now();
      if (now - _lastSoftWarningAt > 30 * 60 * 1000) {
        _lastSoftWarningAt = now;
        window.dispatchEvent(new CustomEvent("exampadi:ai-soft-warning", { detail: check }));
      }
    } catch { /* toast is best-effort */ }
  }
  return check;
}
let _lastSoftWarningAt = 0;

// NOTE: usage is no longer booked here. The server proxy (api/ai.js) is the
// single authority — it enforces the credit limit and writes the counters
// after a successful Groq response, so the client gate above is UX only.

// Verified against GET /openai/v1/models for this API key (Oct 2026).
// Old models (llama-3.x, qwen3-32b, llama-4-scout) no longer exist for this key.
const MODELS = [
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
];

let _lastAIError = null;

export function getLastAIError() {
  return _lastAIError;
}

// Returns the last AI error only if it happened recently (i.e. during the current call)
export function getAIErrorIfRecent(ms = 15000) {
  if (_lastAIError && Date.now() - _lastAIError.time < ms) return _lastAIError;
  return null;
}

export function clearAIError() {
  _lastAIError = null;
}

export function isAIConfigured() {
  // The Groq key now lives only on the server (api/ai.js, GROQ_API_KEY).
  // The client cannot preflight it — real errors surface per call.
  return true;
}

// POST to our own server proxy. The Groq key never touches the browser; the
// server verifies our Firebase ID token, enforces the credit limit, forwards
// to Groq, then books usage. Throws AILimitError on 402 so the existing
// upgrade-modal flow keeps working.
async function postAI({ model, messages, max_tokens, temperature, source, timeoutMs = 45000 }) {
  let token = null;
  try {
    if (auth?.currentUser) token = await auth.currentUser.getIdToken();
  } catch {
    // Leave token null; the user is asked to sign in again below.
  }
  if (!token) throw new Error("Sign in to use the AI tutor.");

  const payload = JSON.stringify({ model, messages, max_tokens, temperature, source });
  let res = await groqFetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: payload,
  }, timeoutMs);

  // A cached Firebase token can be rejected after a long idle period. Force a
  // refresh once, then retry the same request before surfacing an auth error.
  if (res.status === 401) {
    try {
      token = auth?.currentUser ? await auth.currentUser.getIdToken(true) : null;
    } catch {
      token = null;
    }
    if (token) {
      res = await groqFetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: payload,
      }, timeoutMs);
    }
  }

  const data = await res.json().catch(() => null);

  if (res.status === 402 || data?.code === "AI_LIMIT") {
    throw new AILimitError(
      data?.error?.message || "You have used all your AI messages for this period.",
      { ...(data?.info || {}), source }
    );
  }
  if (res.status === 401) {
    throw new Error(data?.error?.message || "Your session expired — sign in again to use the AI tutor.");
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `AI error (${res.status})`);
  }
  if (!data || !Array.isArray(data.choices)) {
    throw new Error("The AI service returned an unexpected response — make sure /api/ai is deployed and configured.");
  }
  return data;
}

function stripJsonFences(text) {
  if (!text) return text;
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  }
  return cleaned.trim();
}

// Fetch with a hard timeout so a stalled network never leaves the UI spinning.
async function groqFetch(url, options, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } catch (e) {
    if (e?.name === "AbortError") {
      throw new Error(`AI request timed out after ${Math.round(timeoutMs / 1000)}s — check your connection and try again.`, { cause: e });
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function sanitizeAIResponse(text) {
  if (!text) return text;
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{3}[\s\S]*?`{3}/g, (m) => m.replace(/`/g, ""))
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+\.\s+/gm, (m) => {
      const num = m.match(/\d+/)[0];
      return `${num}. `;
    });
}

async function callGroqWithFallback(systemPrompt, userPrompt, maxTokens = 300, temperature = 0.5, opts = {}) {
  // Central gate — outside the model loop so AILimitError propagates immediately.
  const source = opts.source || "ai";
  await enforceAILimit(source);

  let lastError;
  for (const model of MODELS) {
    try {
      // gpt-oss models are reasoning models — reasoning tokens count toward max_tokens
      const tokens = model.startsWith("openai/gpt-oss") ? maxTokens + 2000 : maxTokens;
      const data = await postAI({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: tokens,
        temperature,
        source,
      });
      _lastAIError = null;
      return data.choices[0]?.message?.content?.trim() || "";
    } catch (e) {
      if (e?.code === "AI_LIMIT") throw e; // credit exhaustion — no point trying other models
      console.warn(`[AI] Model ${model} failed:`, e.message);
      lastError = e;
    }
  }
  _lastAIError = { message: lastError?.message || "All AI models failed", time: Date.now() };
  throw lastError || new Error("All AI models failed");
}

async function callGroqChatWithFallback(systemPrompt, messages, maxTokens = 600, temperature = 0.8, opts = {}) {
  const source = opts.source || "ai-chat";
  await enforceAILimit(source);

  let lastError;
  for (const model of MODELS) {
    try {
      const tokens = model.startsWith("openai/gpt-oss") ? maxTokens + 2000 : maxTokens;
      const data = await postAI({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: tokens,
        temperature,
        source,
      });
      _lastAIError = null;
      return data.choices[0]?.message?.content?.trim() || "";
    } catch (e) {
      if (e?.code === "AI_LIMIT") throw e;
      console.warn(`[AI] Model ${model} failed:`, e.message);
      lastError = e;
    }
  }
  _lastAIError = { message: lastError?.message || "All AI models failed", time: Date.now() };
  throw lastError || new Error("All AI models failed");
}

import { VISION_MODEL, downscaleDataUrl } from "./vision";
import { topWeakTopics, recentSummaries } from "./aiMemory";

// ─── Vision chat (image-capable). ONLY tries the multimodal model —
// gpt-oss/allam are text-only and cannot accept image payloads.
async function callGroqVisionChat(systemPrompt, textMessages, images, maxTokens = 1000, opts = {}) {
  const source = opts.source || "ai-vision";
  if (!opts.skipGate) await enforceAILimit(source);
  const imageList = (Array.isArray(images) ? images : images ? [images] : []).filter(Boolean).slice(0, 3);
  // Attach image(s) to the last user message (OpenAI content-array format)
  const msgs = textMessages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === "user") {
      msgs[i] = {
        role: "user",
        content: [
          { type: "text", text: String(msgs[i].content || "") },
          ...imageList.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      };
      break;
    }
  }
  try {
    const data = await postAI({
      model: VISION_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...msgs],
      max_tokens: maxTokens,
      temperature: 0.6,
      source,
      // Vision payloads carry base64 images — give the server room to work.
      timeoutMs: 75000,
    });
    _lastAIError = null;
    return data.choices[0]?.message?.content?.trim() || "";
  } catch (e) {
    _lastAIError = { message: e.message, time: Date.now() };
    throw e;
  }
}

// Vision entry point with one downscaled retry before surfacing the real error.
// Accepts imageBase64 (string) or images (array, max 3) for multi-page docs.
export async function askGroqVision({ systemPrompt, messages, imageBase64, images, maxTokens = 1000 }) {
  const list = images || (imageBase64 ? [imageBase64] : []);
  // Gate once at the entry point so the retry below doesn't double-count.
  await enforceAILimit("ai-vision");
  try {
    return await callGroqVisionChat(systemPrompt, messages, list, maxTokens, { skipGate: true });
  } catch (firstErr) {
    // Do not retry on credit exhaustion — the retry would fail the same way.
    if (firstErr?.code === "AI_LIMIT") throw firstErr;
    console.warn("[AI] Vision full-size failed, retrying downscaled:", firstErr.message);
    try {
      const smaller = await Promise.all(list.map((u) => downscaleDataUrl(u, 512)));
      return await callGroqVisionChat(systemPrompt, messages, smaller, maxTokens, { skipGate: true });
    } catch (e) {
      console.warn("[AI] Vision downscaled retry failed:", e.message);
      throw firstErr; // surface the original, more informative error
    }
  }
}

// Document analysis: OCR + key points + likely exam questions from up to 3 pages.
export async function analyzeDocument({ images, subject = "General", instruction = "" }) {
  const system = `You are ExamPadi, a Nigerian exam tutor. Analyze the attached document photo(s) — class notes, textbook pages, or past questions. Respond in 3 short sections: 1) "What this says" (2-3 sentence summary), 2) "Key points to memorize" (up to 5 bullets), 3) "Likely exam questions" (3 questions a JAMB/WAEC examiner could set from this, with one-line answers). Plain simple language. Never say you are built by Google.`;
  const user = instruction.trim()
    || `Analyze this ${subject} document for exam prep.`;
  return askGroqVision({
    systemPrompt: system,
    messages: [{ role: "user", content: user }],
    images,
    maxTokens: 1200,
  });
}

// ─── Memory-aware tutor system prompt ───
const STYLE_INSTRUCTIONS = {
  visual: "Prefer visual explanations: describe diagrams, layouts and what the student should picture or sketch.",
  verbal: "Prefer clear verbal explanations: precise definitions and well-structured prose.",
  example: "Lead with concrete worked examples before stating rules; every concept gets an example first.",
  "step-by-step": "Break everything into small numbered steps; never skip intermediate reasoning.",
};

export function buildTutorSystemPrompt({ subject, userProfile, memory }) {
  const weak = topWeakTopics(memory, 5);
  const style = memory?.preferredStyle;
  const sums = recentSummaries(memory, 3);

  const lines = [
    "You are ExamPadi Tutor — an expert, friendly Nigerian exam tutor specializing in JAMB, WAEC, NECO and NABTEB.",
    "",
    "Student profile:",
    `- Name: ${userProfile?.name || "Student"}`,
    `- Exam: ${userProfile?.exam || "JAMB"}`,
    `- Target score: ${userProfile?.targetScore || "300"}`,
    `- Current subject context: ${subject}`,
    "",
    "Your role:",
    "- Explain concepts clearly using simple Nigerian student-friendly language",
    "- Reference Nigerian curriculum (NERDC, WAEC syllabus)",
    "- Give worked examples with step-by-step solutions",
    "- Be encouraging but honest about weak areas",
    "- Keep responses concise but complete — under 300 words unless solving a long problem",
    "- Always relate answers back to what appears in JAMB/WAEC exams",
    "- Explain WHY an answer is right, not just what it is",
    "- Be direct and precise: lead with the answer, then the shortest correct reasoning",
    "- Break details down stepwise: What → Why → How it appears in exams → What to revise next",
    '- End study-type answers with "What to revise next:" and one concrete topic',
    "- Use emojis naturally (📚 ✅ 💡 🔥 🎯 📝) — be conversational like Claude or Grok",
    "- NEVER use markdown ** for bold — write in plain conversational text instead",
    "- Use bullet points and numbered lists with plain text, not markdown symbols",
  ];

  if (weak.length > 0) {
    lines.push(
      "",
      "Known weak topics for this student (connect new explanations to these when relevant):",
      ...weak.map((w) => `- ${w.subject}: ${w.topic} (${w.errorCount || 0} recent errors)`)
    );
  }
  if (style && STYLE_INSTRUCTIONS[style]) {
    lines.push("", `Preferred learning style (${style}): ${STYLE_INSTRUCTIONS[style]}`);
  }
  if (sums.length > 0) {
    lines.push("", "Recent session notes:");
    sums.forEach((s, i) => {
      const bullets = Array.isArray(s.bullets) ? s.bullets.join("; ") : String(s.bullets || "");
      lines.push(`- Session ${i + 1}: ${bullets}`);
    });
  }

  lines.push("", "Never say you are built by Google or mention Gemini. You are ExamPadi powered by Groq.");
  return lines.join("\n");
}

// Generic single-prompt caller — used by question generators
export async function askGroq(systemPrompt, userPrompt, opts = {}) {
  const result = await callGroqWithFallback(systemPrompt, userPrompt, opts.maxTokens ?? 300, opts.temperature ?? 0.5, { source: opts.source || "askGroq" });
  const { user } = await import("../context/AuthContext").catch(() => ({}));
  logTrainingEntry({
    userId: user?.uid || "anonymous",
    userEmail: user?.email || "",
    type: "askGroq",
    systemPrompt,
    messages: [{ role: "user", content: userPrompt }, { role: "assistant", content: result }],
    metadata: { maxTokens: opts.maxTokens, temperature: opts.temperature },
  }).catch(() => {});
  return result;
}

export async function explainAnswer({ question, options, userAnswer, correctAnswer, subject, exam }) {
  const system = `You are a friendly Nigerian exam tutor for ${exam || "JAMB"}. Never say you are built by Google or mention Gemini. You are ExamPadi powered by Groq.`;
  const user = `Question: ${question}\nOptions: A) ${options.A} B) ${options.B} C) ${options.C} D) ${options.D}\nStudent answered: ${userAnswer}\nCorrect answer: ${correctAnswer}\nSubject: ${subject}\nExplain why ${correctAnswer} is correct in 3-4 sentences. End with a memory tip.`;
  try {
    const result = await callGroqWithFallback(system, user, 300, 0.5, { source: "explainAnswer" });
    const { user: u } = await import("../context/AuthContext").catch(() => ({}));
    logTrainingEntry({ userId: u?.uid || "anonymous", userEmail: u?.email || "", type: "explainAnswer", systemPrompt: system, messages: [{ role: "user", content: user }, { role: "assistant", content: result }], metadata: { subject, exam } }).catch(() => {});
    return result;
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("explainAnswer fallback:", err.message);
    return `The correct answer is ${correctAnswer}. In ${subject}, this concept is fundamental. Review your textbook and practice similar past questions to master this topic. Keep studying!`;
  }
}

export async function explainQuestion({ question, options, correctAnswer, userAnswer, subject, topic }) {
  const system = "You are ExamPadi, an expert Nigerian exam tutor. Never say you are built by Google or mention Gemini. You are ExamPadi powered by Groq.";
  const prompt = `A student answered a ${subject} question incorrectly.

Question: ${question}
Options: ${JSON.stringify(options)}
Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}
Topic: ${topic}

Give a clear, friendly explanation in 3-4 sentences. Explain WHY ${correctAnswer} is correct, and briefly why the student's choice was wrong. Use simple language suitable for SS3 Nigerian students. End with a memory tip.`;
  try {
    const result = await callGroqWithFallback(system, prompt, 300, 0.5, { source: "explainQuestion" });
    const { user } = await import("../context/AuthContext").catch(() => ({}));
    logTrainingEntry({ userId: user?.uid || "anonymous", userEmail: user?.email || "", type: "explainQuestion", systemPrompt: system, messages: [{ role: "user", content: prompt }, { role: "assistant", content: result }], metadata: { subject, topic } }).catch(() => {});
    return result;
  } catch (e) {
    if (e?.code === "AI_LIMIT") throw e;
    console.warn("explainQuestion fallback:", e.message);
    return `The correct answer is ${correctAnswer}. In ${subject}, this concept is fundamental. Review your textbook and practice similar past questions to master this topic. Keep studying!`;
  }
}

export async function chatWithTutor({ messages, subject, userProfile, memory = null, imageBase64 = null, images = null }) {
  let systemPrompt = buildTutorSystemPrompt({ subject, userProfile, memory });

  // RAG: ground the answer in real bank questions matching the latest message
  try {
    const lastUser = [...messages].reverse().find((m) => m.role !== "ai" && String(m.content || "").trim());
    if (lastUser && !images && !imageBase64) {
      const { ragContextFor } = await import("./rag");
      systemPrompt += ragContextFor(lastUser.content, { subject });
    }
  } catch {
    // RAG is best-effort — never break the chat
  }

  const chatMessages = messages.map(m => ({
    role: m.role === "ai" ? "assistant" : "user",
    content: m.content,
  }));

  try {
    // Image(s) present → vision path (multimodal model only, no text-model fallback)
    const imgList = images || (imageBase64 ? [imageBase64] : []);
    if (imgList.length > 0) {
      const result = await askGroqVision({ systemPrompt, messages: chatMessages, images: imgList, maxTokens: 1000 });
      const { user } = await import("../context/AuthContext").catch(() => ({}));
      logTrainingEntry({ userId: user?.uid || "anonymous", userEmail: user?.email || "", type: "chatWithTutor", systemPrompt, messages: [...chatMessages, { role: "assistant", content: result }], metadata: { subject, messageCount: messages.length } }).catch(() => {});
      return result;
    }
    const result = await callGroqChatWithFallback(systemPrompt, chatMessages, 600, 0.8, { source: "tutor-chat" });
    const { user } = await import("../context/AuthContext").catch(() => ({}));
    logTrainingEntry({ userId: user?.uid || "anonymous", userEmail: user?.email || "", type: "chatWithTutor", systemPrompt, messages: [...chatMessages, { role: "assistant", content: result }], metadata: { subject, messageCount: messages.length } }).catch(() => {});
    return result;
  } catch (e) {
    if (e?.code === "AI_LIMIT") throw e;
    console.warn("chatWithTutor fallback:", e.message);
    return `I'm ExamPadi Tutor. I can help with ${subject} questions. Please try asking again — I'm having temporary connectivity issues. In the meantime, review your notes and past questions on this topic.`;
  }
}

export async function getStudyTip(subject, weakTopics) {
  const system = "You are a JAMB/WAEC Nigerian exam coach.";
  const user = `Student is weak in ${subject}. Topics: ${weakTopics.join(", ")}. Give 3 tips.`;
  try {
    return await callGroqWithFallback(system, user, 150, 0.5, { source: "study-tip" });
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("getStudyTip fallback:", err.message);
    return `Focus on past questions for ${weakTopics[0]}. Practice consistently every day. Review your notes and join study groups.`;
  }
}

export async function getDailyQuote() {
  const system = "You write motivational quotes for Nigerian students.";
  const user = "Give one motivational quote.";
  try {
    return await callGroqWithFallback(system, user, 50, 0.5, { source: "daily-quote" });
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("getDailyQuote fallback:", err.message);
    return "Every question you practice today is a problem you won't face on exam day. Keep pushing!";
  }
}

export async function predictLikelyQuestions({ subject, exam, count = 6 }) {
  const system = `You are a ${exam} expert. Predict likely topics for ${subject}. Return ONLY valid JSON array, no markdown fences.`;
  const user = `Predict ${count} topics. Return JSON array like: [{"topic":"...","likelihood":"...","reason":"...","sampleQuestion":"..."}]`;
  try {
    const res = await callGroqWithFallback(system, user, 800, 0.5, { source: "predict-questions" });
    return JSON.parse(stripJsonFences(res));
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("predictLikelyQuestions fallback:", err.message);
    _lastAIError = { message: err.message, time: Date.now() };
    return [
      { topic: "Core Fundamentals", likelihood: "very high", reason: "Always tested.", sampleQuestion: "What is the foundational principle?" }
    ];
  }
}

export async function generateStudyPlan({ targetScore, examDate, weakTopics }) {
  const daysUntilExam = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
  try {
    const system = "You are an exam consultant. Create a study plan as JSON. Return ONLY valid JSON, no markdown fences.";
    const user = `Create a ${Math.max(7, daysUntilExam)}-day study plan for a student targeting ${targetScore}/400. Weak topics: ${weakTopics.join(", ")}.
Return JSON exactly in this shape:
{"totalDays": <number>, "topics": [{"topic": "<name>", "description": "<1-2 sentence plan>", "duration": "<e.g. 2 hours>", "exercises": ["<actionable task>", "..."]}]}
Include 5-8 topics ordered from foundations to final revision.`;
    const res = await callGroqWithFallback(system, user, 1500, 0.5, { source: "study-plan" });
    return JSON.parse(stripJsonFences(res));
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("generateStudyPlan fallback:", err.message);
    _lastAIError = { message: err.message, time: Date.now() };
    return {
      totalDays: Math.max(7, daysUntilExam),
      topics: [
        { topic: "Foundation Review", description: "Revise basic concepts", duration: "2 hours", exercises: ["20 basic questions", "Review formulas"] },
        { topic: "Past Questions", description: "Solve 2018-2023 questions", duration: "3 hours", exercises: ["40 mixed questions", "Review explanations"] },
        { topic: "Weak Topics Focus", description: "Practice weak areas", duration: "2.5 hours", exercises: ["30 topic questions", "Note patterns"] },
        { topic: "Exam Mode Practice", description: "Timed exam conditions", duration: "2 hours", exercises: ["50 questions in 1hr 40mins", "Review score"] },
        { topic: "Final Review", description: "Review mistakes and summaries", duration: "2 hours", exercises: ["Review mistake log", "Read notes"] }
      ]
    };
  }
}

export async function generateFlashcards({ subject, topic, count = 10, exam = "JAMB" }) {  try {
    const system = "You are a Nigerian exam tutor creating revision flashcards. Return ONLY valid JSON, no markdown fences.";
    const user = `Create ${count} exam-focused flashcards for ${exam} ${subject}${topic ? `, topic: ${topic}` : ""}.
Return JSON exactly in this shape:
{"cards": [{"front": "<question or term, max 20 words>", "back": "<concise answer or definition, max 40 words>", "tag": "<topic>"}]}
Cover the highest-yield facts, formulas, definitions and distinctions. No fluff.`;
    const res = await callGroqWithFallback(system, user, 2000, 0.6, { source: "flashcards" });
    const parsed = JSON.parse(stripJsonFences(res));
    const cards = Array.isArray(parsed) ? parsed : parsed.cards;
    if (!Array.isArray(cards) || cards.length === 0) throw new Error("No flashcards returned");
    return cards
      .filter((c) => c && c.front && c.back)
      .map((c, i) => ({ id: i + 1, front: String(c.front), back: String(c.back), tag: c.tag || topic || subject }));
  } catch (err) {
    if (err?.code === "AI_LIMIT") throw err;
    console.warn("generateFlashcards fallback:", err.message);
    _lastAIError = { message: err.message, time: Date.now() };
    return [];
  }
}

// ─── Session summarization ───
// Pro: Groq produces 3 learning bullets + 1 weak topic (1 LLM call).
// Free: instant offline heuristic from scores/weak topics (zero tokens).
export async function summarizeSessionGroq({ subject, correct, total, weakTopics = [] }) {
  const system = "You are a concise study coach. Return ONLY valid JSON, no markdown fences.";
  const user = `A student just finished a ${subject} practice session: ${correct}/${total} correct. Weak topics: ${weakTopics.join(", ") || "none identified"}. Return JSON exactly: {"bullets": ["<bullet 1>", "<bullet 2>", "<bullet 3>"], "weakTopic": "<single weakest topic or null>"}. Each bullet max 15 words, actionable and encouraging.`;
  const res = await callGroqWithFallback(system, user, 300, 0.5, { source: "session-summary" });
  const parsed = JSON.parse(stripJsonFences(res));
  if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) throw new Error("Empty summary");
  return {
    at: Date.now(),
    subject,
    bullets: parsed.bullets.slice(0, 3).map(String),
    weakTopic: parsed.weakTopic || null,
  };
}

export function heuristicSummary({ subject, correct, total, weakTopics = [] }) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const weak = weakTopics[0];
  const bullets = [
    `Scored ${pct}% (${correct}/${total}) in ${subject} — ${pct >= 70 ? "strong session, keep the streak" : pct >= 50 ? "solid base, push weak spots" : "focus session needed on fundamentals"}.`,
    weak ? `Priority revision: ${weak}.` : "No dominant weak topic — broaden coverage next.",
    pct >= 70 ? "Next: timed mixed practice to build exam speed." : "Next: re-attempt missed questions with AI explanations.",
  ];
  return { at: Date.now(), subject, bullets, weakTopic: weak || null };
}

// ─── Guide assistant (helps new users in plain language) ───
// App route map the guide can reference. Keep in sync with App.jsx routes.
export const GUIDE_ROUTES = [
  { path: "/dashboard", label: "Dashboard", keywords: ["home", "dashboard", "start", "overview"] },
  { path: "/select", label: "Practice", keywords: ["practice", "question", "start practicing", "answer", "quiz"] },
  { path: "/mock-exam", label: "Mock Exam", keywords: ["mock", "cbt", "exam mode", "timed", "full exam"] },
  { path: "/ai-tutor", label: "AI Tutor", keywords: ["ai", "tutor", "explain", "understand", "solve", "help me learn", "photo", "stuck"] },
  { path: "/study-plan", label: "Study Plan", keywords: ["plan", "schedule", "timetable", "organize", "routine", "study plan"] },
  { path: "/flashcards", label: "Flashcards", keywords: ["flashcard", "memorize", "remember", "revise", "recall"] },
  { path: "/question-bank", label: "Question Bank", keywords: ["bank", "past question", "browse", "topic"] },
  { path: "/past-questions", label: "Past Questions", keywords: ["past question", "previous year", "likely question", "prediction"] },
  { path: "/stats", label: "Stats", keywords: ["stat", "analytics", "progress", "performance", "score", "weak", "mastery"] },
  { path: "/mastery", label: "Mastery", keywords: ["mastery", "weak topic", "strong"] },
  { path: "/progress", label: "Progress", keywords: ["achievement", "badge", "level"] },
  { path: "/history", label: "History", keywords: ["history", "past session", "review", "mistake"] },
  { path: "/leaderboard", label: "Leaderboard", keywords: ["leaderboard", "rank", "top",
"compete", "xp", "point", "streak"] },
  { path: "/feed", label: "Community Feed", keywords: ["feed", "community", "top students", "help board",
"ask for help", "someone help", "public", "discuss with others"] },
  { path: "/reference", label: "Reference Library", keywords: ["formula", "formulas", "reference",
"periodic table", "constants", "grammar rules", "tenses", "cheat sheet", "tables"] },
  { path: "/ielts", label: "IELTS Japa Pathway", keywords: ["ielts", "japa", "study abroad", "migrate",
"migration", "visa", "canada", "uk", "australia", "band", "english test", "travel"] },
  { path: "/sat", label: "SAT Prep", keywords: ["sat", "american university", "us admission",
"scholarship", "sat score", "1600", "college board", "study in usa"] },
  { path: "/guide/cbt", label: "CBT Guide", keywords: ["cbt guide", "how to use computer", "computer exam",
"operate computer", "mouse", "jamb cbt", "cbt training", "exam hall", "clueless", "never used computer"] },
  { path: "/study-partners", label: "Friend Chat", keywords: ["chat", "message friend", "talk to partner", "discuss problem"] },
  { path: "/room", label: "Study Room", keywords: ["study room", "room code", "live room", "group practice", "classroom live", "study together live", "share room"] },
  { path: "/study-partners", label: "Study Partners", keywords: ["partner", "friend", "together", "share test", "invite"] },
  { path: "/assignments", label: "Assignments", keywords: ["assignment", "homework", "task"] },
  { path: "/notepad", label: "Notepad", keywords: ["note", "write", "formula"] },
  { path: "/settings", label: "Settings", keywords: ["setting", "subject", "change subject", "theme", "dark", "light", "notification", "reminder", "language"] },
  { path: "/profile", label: "Profile", keywords: ["profile", "avatar", "photo", "name", "account", "delete"] },
  { path: "/payment", label: "Go Pro", keywords: ["pro", "pay", "upgrade", "cost", "price", "subscription", "unlock", "limit"] },
  { path: "/help", label: "Help", keywords: ["help", "guide", "how to", "support"] },
  { path: "/contact", label: "Contact", keywords: ["contact", "human", "whatsapp", "email", "complain"] },
];

// Local intent matcher: free, instant, offline. Returns matched routes.
export function matchGuideRoutes(text) {
  const lower = String(text || "").toLowerCase();
  const scored = GUIDE_ROUTES.map((r) => {
    let score = 0;
    for (const k of r.keywords) {
      if (lower.includes(k)) score += k.length; // longer keyword = more specific
    }
    return { ...r, score };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

// AI-powered guide answer: organized steps referencing real app pages.
export async function askGuide(issueText, userProfile) {
  const system = `You are the ExamPadi Guide. A new student describes an issue or goal in plain
words. Respond with a short, organized plan: 1-3 numbered steps, each naming the EXACT app page to open from this
list: Dashboard, Practice, Mock Exam, AI Tutor, Study Plan, Flashcards, Question Bank, Past Questions, Stats, Mastery,
Progress, History, Leaderboard, Community Feed, Reference Library, IELTS Japa Pathway, SAT Prep, CBT Guide, Friend Chat, Study Room, Study Partners, Assignments, Notepad, Settings, Profile, Go Pro, Help, Contact. Rules:
max 120 words; plain simple language; if they need a human, point to Contact (WhatsApp). Never invent pages. Never say
you are built by Google. You are ExamPadi powered by Groq.`;
  const user = `Student says: "${issueText}". Student exam: ${userProfile?.exam || "JAMB"}. Give the organized steps.`;
  return callGroqWithFallback(system, user, 300, 0.5, { source: "guide" });
}

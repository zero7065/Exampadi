// api/image.js — image generation proxy for free-tier providers.
//
// Providers (in auto order): Google Gemini free tier (GEMINI_API_KEY),
// Hugging Face free inference (HF_API_KEY), Pollinations (no key required).
// Keys stay server-side; the client sends a Firebase ID token for keyed
// providers. Groq itself cannot generate images — it only reads them.

import { getFirebase } from "./_firebase.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODELS = [
  process.env.GEMINI_IMAGE_MODEL,
  "gemini-2.5-flash-image",
  "gemini-2.0-flash-preview-image-generation",
].filter(Boolean);
const HF_MODEL = process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";
const MAX_PROMPT = 800;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function pollinationsUrl(prompt) {
  const seed = Math.floor(Math.random() * 1_000_000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 500))}?width=896&height=672&nologo=true&seed=${seed}`;
}

async function geminiGenerate(key, prompt) {
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
        signal: AbortSignal.timeout(55_000),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        lastError = new Error(json?.error?.message || `Gemini error (${res.status})`);
        continue;
      }
      const parts = json?.candidates?.[0]?.content?.parts || [];
      const part = parts.find((p) => p?.inlineData?.data || p?.inline_data?.data);
      const inline = part?.inlineData || part?.inline_data;
      if (!inline?.data) {
        lastError = new Error("Gemini returned no image for that prompt");
        continue;
      }
      const mime = inline.mimeType || inline.mime_type || "image/png";
      return { image: `data:${mime};base64,${inline.data}`, provider: "gemini", model, kind: "data" };
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Gemini image generation failed");
}

async function hfGenerate(key, prompt) {
  const res = await fetch(`https://router.huggingface.co/hf-inference/models/${HF_MODEL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(55_000),
  });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !type.startsWith("image/")) {
    const text = await res.text().catch(() => "");
    let message = `Hugging Face error (${res.status})`;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.error || message;
    } catch {
      if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    image: `data:${type};base64,${buffer.toString("base64")}`,
    provider: "huggingface",
    model: HF_MODEL,
    kind: "data",
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: { message: "Method not allowed" } });

  const body = typeof req.body === "string" ? safeParse(req.body) : req.body;
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) return res.status(400).json({ error: { message: "Describe the image you want." } });
  if (prompt.length > MAX_PROMPT) {
    return res.status(400).json({ error: { message: `Prompt too long (max ${MAX_PROMPT} characters).` } });
  }
  const requested = String(body?.provider || "auto").toLowerCase();

  // Keyless provider — no auth or quota involved.
  if (requested === "pollinations") {
    return res.status(200).json({ ok: true, prompt, provider: "pollinations", kind: "url", image: pollinationsUrl(prompt) });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const hfKey = process.env.HF_API_KEY;
  if (!geminiKey && !hfKey) {
    return res.status(503).json({
      error: {
        message: "No image provider configured — add GEMINI_API_KEY (Google AI Studio, free) or HF_API_KEY (Hugging Face, free) in Vercel.",
      },
      code: "NO_IMAGE_PROVIDER",
    });
  }

  const fb = getFirebase();
  if (!fb) {
    return res.status(500).json({
      error: { message: "Server auth is not configured — add FIREBASE_SERVICE_ACCOUNT in Vercel." },
      code: "NO_SERVICE_ACCOUNT",
    });
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ error: { message: "Sign in to generate images." }, code: "AUTH_REQUIRED" });
  }
  try {
    const decoded = await fb.admin.auth().verifyIdToken(token);
    if (!decoded?.uid) throw new Error("no uid");
  } catch {
    return res.status(401).json({ error: { message: "Your session expired — sign in again." }, code: "AUTH_INVALID" });
  }

  const order = [];
  if (requested === "gemini") order.push("gemini");
  else if (requested === "huggingface" || requested === "hf") order.push("hf");
  else {
    if (geminiKey) order.push("gemini");
    if (hfKey) order.push("hf");
  }
  if (!order.length) {
    return res.status(503).json({
      error: { message: "That provider is not configured on this server." },
      code: "PROVIDER_NOT_CONFIGURED",
    });
  }

  let lastError;
  for (const provider of order) {
    try {
      const result = provider === "gemini"
        ? await geminiGenerate(geminiKey, prompt)
        : await hfGenerate(hfKey, prompt);
      return res.status(200).json({ ok: true, prompt, ...result });
    } catch (e) {
      lastError = e;
      console.warn(`[image] ${provider} failed:`, e?.message);
    }
  }

  return res.status(502).json({
    error: { message: lastError?.message || "Could not generate an image right now." },
    code: "IMAGE_FAILED",
  });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

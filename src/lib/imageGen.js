// src/lib/imageGen.js — image generation client.
//
// Flow: detect intent → propose/confirm the prompt → generate via /api/image
// (Gemini/Hugging Face with free keys) → verify the output with the vision
// model. Keyless Pollinations remains as a fallback so diagrams always work.

import { auth } from "../firebaseConfig";
import { apiUrl } from "./apiBase";
import { askGroq, askGroqVision } from "./ai";
import { downscaleDataUrl } from "./vision";

export const IMAGE_PROVIDERS = [
  { id: "auto", label: "Auto (best available)" },
  { id: "gemini", label: "Google Gemini — free API key" },
  { id: "huggingface", label: "Hugging Face — free API key" },
  { id: "pollinations", label: "Pollinations — no key needed" },
];

const IMAGE_INTENT =
  /\b(draw|sketch|illustrate|generate (an|a) (image|picture|illustration|diagram)|create (an|a) (image|picture|illustration|diagram)|make (an|a) (image|picture|illustration|diagram)|show me (an|a) (image|picture|illustration|diagram)|(picture|image|diagram|illustration) of)\b/i;

export function isImageRequest(text) {
  return IMAGE_INTENT.test(String(text || ""));
}

export function keylessImageUrl(prompt) {
  const seed = Math.floor(Math.random() * 1_000_000);
  const p = encodeURIComponent(String(prompt || "").slice(0, 500));
  return `https://image.pollinations.ai/prompt/${p}?width=896&height=672&nologo=true&seed=${seed}`;
}

// Turn a student's request into a concrete illustration brief. Falls back to
// the raw request when the text model is unavailable.
export async function proposeImagePrompt(request) {
  const raw = String(request || "").trim().slice(0, 400);
  try {
    const result = await askGroq(
      "Rewrite the student's request as one vivid, detailed prompt for an educational illustration or diagram for a Nigerian secondary school student. Describe subject, labels, style, colours and layout in under 60 words. Reply with ONLY the prompt text.",
      raw,
      { maxTokens: 200, source: "image-prompt" }
    );
    const brief = String(result || "").replace(/^["'`\n]+|["'`\n]+$/g, "").trim();
    if (brief.length > 10) return brief;
  } catch {
    // Enrichment is optional — use the raw request.
  }
  return raw;
}

function keylessResult(prompt) {
  return { ok: true, image: keylessImageUrl(prompt), provider: "pollinations", kind: "url", prompt };
}

export async function generateImage({ prompt, provider = "auto" }) {
  const clean = String(prompt || "").trim();
  if (!clean) throw new Error("Describe the image you want first.");

  let token = null;
  try {
    token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
  } catch {
    token = null;
  }
  if (!token) {
    if (provider === "auto" || provider === "pollinations") return keylessResult(clean);
    throw new Error("Sign in to generate images with that provider.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 70_000);
  let res;
  try {
    res = await fetch(apiUrl("/api/image"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prompt: clean, provider }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === "AbortError") throw new Error("Image generation timed out — try again.");
    if (provider === "auto" || provider === "pollinations") return keylessResult(clean);
    throw new Error("Could not reach the image service.");
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (res.ok && data?.image) return data;

  const noProvider =
    data?.code === "NO_IMAGE_PROVIDER" ||
    res.status === 503 ||
    res.status === 404 ||
    res.status === 405;
  if (noProvider && (provider === "auto" || provider === "pollinations")) {
    return keylessResult(clean);
  }
  throw new Error(data?.error?.message || `Image generation failed (${res.status}).`);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(blob);
  });
}

async function toSmallDataUrl(src) {
  try {
    if (src.startsWith("data:")) {
      if (src.length < 300_000) return src;
      return await downscaleDataUrl(src, 512);
    }
    const res = await fetch(src, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return null;
    const dataUrl = await blobToDataUrl(await res.blob());
    return await downscaleDataUrl(dataUrl, 512);
  } catch {
    return null;
  }
}

// "Output verifying the command": send the generated image back to the vision
// model and report whether it matches the approved brief.
export async function verifyImage({ imageUrl, prompt }) {
  const dataUrl = await toSmallDataUrl(imageUrl);
  if (!dataUrl) {
    return { ok: false, note: "Verification skipped — the image could not be read back." };
  }
  try {
    const text = await askGroqVision({
      systemPrompt:
        "You verify generated educational images. Be concise, honest and specific. Never mention being built by Google or Gemini.",
      messages: [
        {
          role: "user",
          content: `Does this image match this request: "${String(prompt || "").slice(0, 300)}"? Reply in two short sentences: 1) match: yes / partly / no, 2) what the image actually shows or what is missing.`,
        },
      ],
      images: [dataUrl],
      maxTokens: 220,
    });
    return { ok: true, note: String(text || "").trim() };
  } catch (e) {
    return {
      ok: false,
      note:
        e?.code === "AI_LIMIT"
          ? "Verification needs one AI message credit — image generated successfully."
          : "Verification unavailable right now — image generated successfully.",
    };
  }
}

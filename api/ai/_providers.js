const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function timeoutSignal(ms) {
  return AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
}

function errorMessage(json, status, provider) {
  return json?.error?.message
    || json?.message
    || `${provider} returned HTTP ${status}`;
}

function normalizeDataUrl(value) {
  if (!value || typeof value !== "string") return null;
  const dataUrl = value.match(/^data:([^;]+);base64,(.+)$/i);
  if (dataUrl) return { mimeType: dataUrl[1] || "image/jpeg", data: dataUrl[2] };
  return { mimeType: "image/jpeg", data: value };
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part?.type === "text") return String(part.text || "");
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function extractImages(content) {
  if (!Array.isArray(content)) return [];
  return content
    .map((part) => {
      if (part?.type === "image_url") return normalizeDataUrl(part.image_url?.url);
      if (part?.type === "image") return normalizeDataUrl(part.image?.url || part.data);
      if (part?.inlineData?.data) return normalizeDataUrl(part.inlineData.data);
      if (part?.inline_data?.data) return normalizeDataUrl(part.inline_data.data);
      return null;
    })
    .filter(Boolean);
}

function attachImageIfMissing(messages, image) {
  const normalized = normalizeDataUrl(image);
  if (!normalized) return messages;
  const copy = (messages || []).map((message) => ({
    ...message,
    content: Array.isArray(message?.content)
      ? [...message.content]
      : message?.content,
  }));
  for (let i = copy.length - 1; i >= 0; i -= 1) {
    if (copy[i]?.role !== "user") continue;
    if (Array.isArray(copy[i].content)) {
      const alreadyHasImage = copy[i].content.some((part) => part?.type === "image_url");
      if (!alreadyHasImage) {
        copy[i].content.push({
          type: "image_url",
          image_url: { url: `data:${normalized.mimeType};base64,${normalized.data}` },
        });
      }
    } else {
      copy[i].content = [
        { type: "text", text: String(copy[i].content || "") },
        { type: "image_url", image_url: { url: `data:${normalized.mimeType};base64,${normalized.data}` } },
      ];
    }
    break;
  }
  return copy;
}

async function callOpenAICompatible(provider, url, key, model, options) {
  const { messages, image, maxTokens, temperature, timeoutMs = 45_000 } = options;
  const bodyMessages = image ? attachImageIfMissing(messages, image) : messages;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: bodyMessages,
      max_tokens: maxTokens,
      temperature,
    }),
    signal: timeoutSignal(timeoutMs),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.choices) {
    return {
      ok: false,
      provider,
      model,
      error: { code: `${provider}_${res.status}`, message: errorMessage(json, res.status, provider) },
    };
  }
  return { ok: true, provider, model, response: json };
}

async function callGroq(model, options) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, provider: "groq", model, error: { code: "no_key", message: "GROQ_API_KEY is not set" } };
  try {
    return await callOpenAICompatible("groq", GROQ_URL, key, model, options);
  } catch (e) {
    return { ok: false, provider: "groq", model, error: { code: "groq_network", message: e?.message || "Groq request failed" } };
  }
}

async function callOpenAI(model, options) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: false, provider: "openai", model, error: { code: "no_key", message: "OPENAI_API_KEY is not set" } };
  try {
    return await callOpenAICompatible("openai", OPENAI_URL, key, model, options);
  } catch (e) {
    return { ok: false, provider: "openai", model, error: { code: "openai_network", message: e?.message || "OpenAI request failed" } };
  }
}

function geminiPartsFromContent(content, extraImage) {
  const parts = [];
  const text = extractText(content);
  if (text) parts.push({ text });
  for (const image of extractImages(content)) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }
  const normalized = normalizeDataUrl(extraImage);
  if (normalized) {
    parts.push({ inlineData: { mimeType: normalized.mimeType, data: normalized.data } });
  }
  return parts;
}

async function callGemini(model, options) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, provider: "gemini", model, error: { code: "no_key", message: "GEMINI_API_KEY is not set" } };
  const { messages, image, maxTokens, temperature, timeoutMs = 45_000 } = options;
  try {
    const systemText = (messages || [])
      .filter((message) => message?.role === "system")
      .map((message) => extractText(message?.content))
      .filter(Boolean)
      .join("\n\n");

    const nonSystem = (messages || []).filter((message) => message?.role !== "system");
    let lastUserId = -1;
    for (let i = nonSystem.length - 1; i >= 0; i -= 1) {
      if (nonSystem[i]?.role !== "assistant") {
        lastUserId = i;
        break;
      }
    }
    const contents = [];
    nonSystem.forEach((message, index) => {
      const role = message?.role === "assistant" ? "model" : "user";
      const parts = geminiPartsFromContent(message?.content, index === lastUserId ? image : null);
      if (parts.length === 0) return;
      const previous = contents[contents.length - 1];
      if (previous?.role === role) previous.parts.push(...parts);
      else contents.push({ role, parts });
    });

    const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        contents,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      }),
      signal: timeoutSignal(timeoutMs),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        provider: "gemini",
        model,
        error: { code: `gemini_${res.status}`, message: errorMessage(json, res.status, "Gemini") },
      };
    }

    const text = json?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || "";
    if (!text) {
      return {
        ok: false,
        provider: "gemini",
        model,
        error: { code: "gemini_empty", message: "Gemini returned an empty response." },
      };
    }
    const usage = json?.usageMetadata || {};
    return {
      ok: true,
      provider: "gemini",
      model,
      response: {
        id: `gemini_${Date.now()}`,
        object: "chat.completion",
        model,
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: {
          prompt_tokens: Number(usage.promptTokenCount) || 0,
          completion_tokens: Number(usage.candidatesTokenCount) || 0,
          total_tokens: Number(usage.totalTokenCount) || 0,
        },
      },
    };
  } catch (e) {
    return { ok: false, provider: "gemini", model, error: { code: "gemini_network", message: e?.message || "Gemini request failed" } };
  }
}

export async function callProvider(provider, model, options) {
  if (provider === "groq") return callGroq(model, options);
  if (provider === "openai") return callOpenAI(model, options);
  if (provider === "gemini") return callGemini(model, options);
  return { ok: false, provider, model, error: { code: "unknown_provider", message: `Unknown provider: ${provider}` } };
}

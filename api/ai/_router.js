const ROUTING = {
  chat: {
    free: [{ p: "groq", m: "openai/gpt-oss-20b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-120b" }],
  },
  explain: {
    free: [{ p: "groq", m: "openai/gpt-oss-20b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-120b" }],
  },
  solve: {
    free: [{ p: "groq", m: "qwen/qwen3.8-27b" }],
    paid: [{ p: "groq", m: "qwen/qwen3.8-27b" }, { p: "openai", m: "gpt-4o" }],
  },
  plan: {
    free: [{ p: "groq", m: "openai/gpt-oss-120b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-120b" }, { p: "openai", m: "gpt-4o-mini" }],
  },
  predict: {
    free: [{ p: "groq", m: "openai/gpt-oss-120b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-120b" }, { p: "openai", m: "gpt-4o-mini" }],
  },
  flashcard: {
    free: [{ p: "groq", m: "openai/gpt-oss-20b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-20b" }],
  },
  grade: {
    free: [{ p: "groq", m: "openai/gpt-oss-120b" }],
    paid: [{ p: "groq", m: "openai/gpt-oss-120b" }, { p: "openai", m: "gpt-4o-mini" }],
  },
  vision: {
    free: [
      { p: "gemini", m: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash" },
      { p: "groq", m: "qwen/qwen3.8-27b" },
    ],
    paid: [
      { p: "gemini", m: process.env.GEMINI_VISION_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash" },
      { p: "openai", m: "gpt-4o-mini" },
      { p: "groq", m: "qwen/qwen3.8-27b" },
    ],
  },
};

export function planTier(plan) {
  const value = String(plan || "free");
  if (value === "paid" || value === "free") return value;
  return /pro|team|ielts/.test(value) ? "paid" : "free";
}

export function routeFor(intent, plan) {
  const tier = planTier(plan);
  return ROUTING[intent]?.[tier] || ROUTING.chat[tier];
}

export function providerAvailable(provider) {
  if (provider === "groq") return Boolean(process.env.GROQ_API_KEY);
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY);
  if (provider === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return false;
}

export function availableRouteFor(intent, plan) {
  const seen = new Set();
  return routeFor(intent, plan).filter((step) => {
    if (!providerAvailable(step.p)) return false;
    const key = `${step.p}:${step.m}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

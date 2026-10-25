// api/health.js — non-secret configuration probe for the admin dashboard.
// Returns booleans only, never key values.
import { getFirebaseDiagnostics } from "./_firebase.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(204).end();

  const firebase = getFirebaseDiagnostics();
  const services = {
    groq: !!process.env.GROQ_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    huggingface: !!process.env.HF_API_KEY,
    firebaseAdmin: firebase.ready,
    firebaseAdminConfigured: firebase.configured,
    paystack: !!process.env.PAYSTACK_SECRET_KEY,
  };

  const missing = [];
  if (!services.groq && !services.openai) missing.push("GROQ_API_KEY or OPENAI_API_KEY");
  if (!services.firebaseAdmin) missing.push("FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY");
  if (!services.gemini && !services.huggingface) missing.push("GEMINI_API_KEY or HF_API_KEY (images)");

  return res.status(200).json({
    ok: missing.length === 0,
    services,
    aiGateway: {
      version: "2.0.0",
      route: "/api/ai",
      providers: ["groq", "openai", "gemini"].filter((name) => services[name]),
      cache: "aiCache",
      logs: ["aiLogs", "aiLogsDaily"],
    },
    firebaseAdminReason: firebase.reason,
    missing,
    aiReady: (services.groq || services.openai || services.gemini) && services.firebaseAdmin,
    visionReady: (services.gemini || services.groq || services.openai) && services.firebaseAdmin,
    imagesReady: (services.gemini || services.huggingface) && services.firebaseAdmin,
    time: new Date().toISOString(),
  });
}

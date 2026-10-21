// scripts/check-env.js — fails the build with a clear error when required
// VITE_* variables are missing. Run via the "prebuild" npm script
// (also runs on Vercel, so misconfigured deploys fail fast, not silently).
import fs from "node:fs";
import path from "node:path";

const REQUIRED = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_PAYSTACK_PUBLIC_KEY",
];

const OPTIONAL = [
  "VITE_FIREBASE_VAPID_KEY",
  "VITE_SENTRY_DSN",
  "VITE_GA_MEASUREMENT_ID",
  "VITE_ADMIN_UIDS",
  "VITE_APP_URL",
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
];

// Load local .env (if present) so `npm run build` validates the same way Vercel does.
function loadDotEnv() {
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch (_) {
    // ignore — env may come from the platform instead
  }
}

loadDotEnv();

const missing = REQUIRED.filter((k) => !process.env[k] || !String(process.env[k]).trim());
const missingOptional = OPTIONAL.filter((k) => !process.env[k] || !String(process.env[k]).trim());

if (missingOptional.length > 0) {
  console.warn(
    `[check-env] optional vars not set (features degrade gracefully): ${missingOptional.join(", ")}`
  );
}

if (missing.length > 0) {
  console.error(
    `\n[check-env] BUILD BLOCKED — missing required environment variables:\n` +
      missing.map((k) => `  - ${k}`).join("\n") +
      `\n\nAdd them to .env (local) or the Vercel dashboard (Project → Settings → Environment Variables).\nSee .env.example for the full list.\n`
  );
  process.exit(1);
}

console.log("[check-env] all required env vars present.");

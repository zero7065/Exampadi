// Retry helper for transient Firebase failures (survives partial ISP blocking).
const RETRYABLE = new Set([
  "unavailable",
  "deadline-exceeded",
  "resource-exhausted",
  "internal",
  "auth/network-request-failed",
]);

export function isRetryableError(err) {
  if (!err) return false;
  if (RETRYABLE.has(err.code)) return true;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("failed to fetch") ||
    msg.includes("connection closed")
  );
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Runs fn(); on retryable errors retries with exponential backoff.
// Options: { retries: 2, baseMs: 500, factor: 2, onRetry }
export async function withRetry(fn, { retries = 2, baseMs = 500, factor = 2, onRetry } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isRetryableError(err)) throw err;
      attempt++;
      try { onRetry?.(attempt, err); } catch (_) { /* onRetry is best-effort */ }
      await sleep(baseMs * Math.pow(factor, attempt - 1));
    }
  }
}

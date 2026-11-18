// src/lib/connectionHealth.js
// Detects *partial* connectivity: navigator.onLine says "online" but critical
// Firebase hosts (securetoken / firestore) are unreachable (ISP filtering).

const FIREBASE_KEY =
  (import.meta.env?.VITE_FIREBASE_API_KEY) || "AIzaSyDbXyJpW351DfqEyxwrsc4zZUNLcltaGQE";

let _degraded = false;
const listeners = new Set();

// Sync anything saved locally while offline (sessions, queued writes).
// Dynamic imports avoid hard deps and keep this module side-effect free.
async function flushPendingData() {
  try {
    const { flushLocalSessions } = await import("./questions");
    await flushLocalSessions().catch(() => {});
  } catch {
    // questions module unavailable — skip
  }
  try {
    const { flushQueue } = await import("./offlineQueue");
    await flushQueue().catch(() => {});
  } catch {
    // offline queue unavailable — skip
  }
}

export function isDegraded() {
  return _degraded;
}

export function onConnectionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(next) {
  if (_degraded === next) return;
  _degraded = next;
  listeners.forEach((fn) => {
    try { fn(next); } catch (_) {
      // listener threw — keep notifying the rest
    }
  });
}

async function probe(url, { method = "GET", timeout = 5000 } = {}) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    await fetch(url, { method, signal: controller.signal, mode: "cors" });
    clearTimeout(timer);
    return true; // any HTTP response = reachable
  } catch (_) {
    return false; // network error / timeout = blocked
  }
}

// Returns true when critical hosts are unreachable despite navigator.onLine.
export async function checkConnectionHealth() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    emit(true);
    return true;
  }

  // Probe a real GET endpoint — a body-less POST to /v1/token always returns 400.
  const checks = await Promise.all([
    probe(`https://identitytoolkit.googleapis.com/v1/projects?key=${FIREBASE_KEY}`),
  ]);

  const blocked = checks.filter((c) => !c).length;
  emit(blocked > 0);
  return blocked > 0;
}

// Starts periodic + event-driven health checks. Returns a cleanup function.
export function startConnectionMonitor({ intervalMs = 60000 } = {}) {
  let running = false;

  async function run() {
    if (running) return;
    running = true;
    try {
      await checkConnectionHealth();
    } finally {
      running = false;
    }
  }

  const onOnline = () => { emit(false); run(); flushPendingData(); };
  const onOffline = () => emit(true);
  const onFocus = () => run();

  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", onFocus);

  run();
  flushPendingData();
  const timer = setInterval(run, intervalMs);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("focus", onFocus);
    clearInterval(timer);
  };
}

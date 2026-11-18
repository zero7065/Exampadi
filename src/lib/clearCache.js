// Version-gated service worker / cache cleanup.
// Runs the aggressive wipe at most ONCE per SW_VERSION (not on every page load),
// so the offline app shell survives across visits. Bump SW_VERSION when shipping
// a build that must force clients off stale cached bundles.
const SW_VERSION = "2026-10-08a";

export function getSwVersion() {
  return SW_VERSION;
}

// Aggressive wipe — only when forced or when the version changed.
export async function clearOldServiceWorker({ force = false } = {}) {
  try {
    let lastSeen = null;
    try {
      lastSeen = localStorage.getItem("exampadi_sw_version");
    } catch (_) { /* localStorage unavailable — treat as first visit */ }

    if (!force && lastSeen === SW_VERSION) {
      return false; // already cleaned for this build
    }

    // Unregister ALL service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        try { await reg.unregister(); } catch (_) { /* keep wiping the rest */ }
      }
    }

    // Clear all caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        try { await caches.delete(name); } catch (_) { /* keep wiping the rest */ }
      }
    }

    try {
      localStorage.setItem("exampadi_sw_version", SW_VERSION);
    } catch (_) { /* non-fatal if storage is full/blocked */ }

    return true;
  } catch (e) {
    console.warn("SW cleanup failed:", e);
    return false;
  }
}

// src/lib/activeSession.js — one resumable in-progress session per device.
// Used by practice, CBT and mock exam so a learner can pause and continue later.
export const ACTIVE_SESSION_KEY = "exampadi_active_session";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // sessions older than 24h are discarded

export function saveActiveSession(data) {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* storage full/blocked — non-fatal */ }
}

export function loadActiveSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    const stamp = s.savedAt || s.startTime || 0;
    if (!s.questions?.length || Date.now() - stamp > MAX_AGE_MS) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try { localStorage.removeItem(ACTIVE_SESSION_KEY); } catch { /* non-fatal */ }
}

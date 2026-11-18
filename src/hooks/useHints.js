const MAX = 5;

export function useHint(sessionId) {
  const key = `ep_hints_${sessionId}`;
  const used = parseInt(localStorage.getItem(key) || "0");
  const remaining = MAX - used;

  function use() {
    if (remaining <= 0) return false;
    localStorage.setItem(key, String(used + 1));
    return true;
  }

  function reset() {
    localStorage.removeItem(key);
  }

  return { used, remaining, max: MAX, use, reset, canUse: remaining > 0 };
}

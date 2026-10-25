// api/_plans.js — shared server-side plan helpers.
// Single source of truth for subscription durations so verify-payment and the
// webhook can never drift apart. Keep in sync with src/config/plans.js pricing.
export const YEARLY_PLANS = new Set(["pro_yearly", "ielts", "team_yearly"]);
// ai_pack_50 is a one-off credit grant — NOT a subscription.
export const PACK_PLANS = new Set(["ai_pack_50"]);
export const TEAM_PLANS = new Set(["team_monthly", "team_yearly"]);
export const KNOWN_PLANS = new Set([
  "free", "pro_monthly", "pro_yearly", "ielts",
  "team_monthly", "team_yearly",
  "ai_pack_50",
]);

export const AI_PACK_MESSAGES = 50;

// Human-readable subscription end date for a plan (local time, end of day).
export function endDateFor(plan) {
  const d = new Date();
  if (YEARLY_PLANS.has(plan)) d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 30);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isTeamPlan(plan) {
  return TEAM_PLANS.has(plan);
}

export function isPackPlan(plan) {
  return PACK_PLANS.has(plan);
}

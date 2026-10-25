import { aiLimitsFor } from "../../src/config/plans.js";

const WAT_OFFSET_MS = 60 * 60 * 1000;
export const PRO_PLAN_IDS = new Set(["pro_monthly", "pro_yearly", "ielts", "team_monthly", "team_yearly"]);

export function dayKey(now) {
  return new Date(now.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 10);
}

export function monthKey(now) {
  return new Date(now.getTime() + WAT_OFFSET_MS).toISOString().slice(0, 7);
}

export function limitState(userData, now = new Date()) {
  try {
    const subscription = userData?.subscription;
    const planId = subscription?.status === "active" && PRO_PLAN_IDS.has(subscription.plan)
      ? subscription.plan
      : "free";
    const limits = aiLimitsFor(planId);
    const isFree = planId === "free";
    const day = dayKey(now);
    const month = monthKey(now);
    const dayFresh = userData?.lastAIDay === day;
    const monthFresh = userData?.aiMonth === month;
    const usedToday = dayFresh ? Number(userData?.aiMessagesDay || 0) : 0;
    const monthUsed = monthFresh ? Number(userData?.aiMessagesMonth || 0) : 0;
    const pack = Number(userData?.aiPackCredits || 0);
    const dailyCap = isFree ? (limits.perDay || 3) : (limits.dailyCap || Infinity);
    const monthLimit = isFree ? 0 : (limits.perMonth || Infinity);
    const baseReached = isFree ? usedToday >= dailyCap : monthUsed >= monthLimit;
    return {
      allowed: !(baseReached && pack <= 0),
      planId,
      isFree,
      day,
      month,
      dayFresh,
      monthFresh,
      usedToday,
      monthUsed,
      pack,
      dailyCap,
      monthLimit,
      limits,
    };
  } catch (error) {
    console.warn("[ai] limitState failed (fail-open):", error?.message);
    return {
      allowed: true,
      planId: "free",
      isFree: true,
      day: dayKey(now),
      month: monthKey(now),
      dayFresh: false,
      monthFresh: false,
      usedToday: 0,
      monthUsed: 0,
      pack: 0,
      dailyCap: 3,
      monthLimit: 0,
      limits: null,
    };
  }
}

export async function bookUsage(db, adminLib, uid, state, { model, tokens, source, intent } = {}) {
  try {
    const increment = adminLib.firestore.FieldValue.increment;
    const update = {};

    if (state.dayFresh) update.aiMessagesDay = increment(1);
    else {
      update.lastAIDay = state.day;
      update.aiMessagesDay = 1;
    }

    if (state.monthFresh) update.aiMessagesMonth = increment(1);
    else {
      update.aiMonth = state.month;
      update.aiMessagesMonth = 1;
    }

    const overBase = state.isFree
      ? state.usedToday >= (state.limits?.perDay || 3)
      : state.monthUsed >= (state.limits?.perMonth || Infinity);
    if (overBase && state.pack > 0) update.aiPackCredits = increment(-1);

    await db.collection("users").doc(uid).set(update, { merge: true });

    await db.collection("aiUsageLog").add({
      userId: uid,
      plan: state.planId,
      model: model || null,
      tokens: tokens ?? null,
      source: source || "ai",
      intent: intent || null,
      gateway: "2.0.0",
      createdAt: adminLib.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    const usedToday = state.dayFresh ? state.usedToday + 1 : 1;
    const monthUsed = state.monthFresh ? state.monthUsed + 1 : 1;
    const creditRemaining = Math.max(
      0,
      state.isFree
        ? (state.pack - (overBase && state.pack > 0 ? 1 : 0))
        : Math.max(0, (state.monthLimit - monthUsed)) + Math.max(0, state.pack - (overBase && state.pack > 0 ? 1 : 0))
    );

    return { usedToday, monthUsed, creditRemaining };
  } catch (error) {
    console.warn("[ai] bookUsage failed:", error?.message);
    return {
      usedToday: state.usedToday,
      monthUsed: state.monthUsed,
      creditRemaining: state.pack,
    };
  }
}

export const DAILY_COST_CEILING_USD = 0.15;
export const MONTHLY_COST_CEILING_USD = 2.00;
export const FREE_DAILY_COST_CEILING_USD = 0.02;

export function checkCostCeiling(rollup, plan) {
  const dailySpend = Number(rollup?.totalCostUsd || 0);
  const ceiling = plan === "free" ? FREE_DAILY_COST_CEILING_USD : DAILY_COST_CEILING_USD;
  if (dailySpend >= ceiling) {
    return { allowed: false, reason: "daily_cost_ceiling", ceiling, dailySpend };
  }
  return { allowed: true, ceiling, dailySpend };
}

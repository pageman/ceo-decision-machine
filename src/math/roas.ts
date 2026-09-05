/**
 * Proposition 3 — ROAS ceiling.
 * Diminishing returns: α(s) = α0 · s^(−β). Profit(s) = s·(α(s) − 1) = α0·s^(1−β) − s.
 * Interior optimum: dProfit/ds = 0  ⇒  s* = (α0(1−β))^(1/β), r* = α(s*) = 1/(1−β).
 * Spend/profit computed in dollars (s = daily spend), reported in cents.
 */
import type { RoasResult, RoasScenario } from '../types';

export function computeRoas(alpha0 = 3, beta = 0.3): RoasResult {
  const b = Math.min(0.5, Math.max(0.1, beta));

  const scenarios: RoasScenario[] = [];
  for (let r100 = 100; r100 <= 500; r100 += 25) {
    const r = r100 / 100;
    const s = Math.pow(alpha0 / r, 1 / b);
    scenarios.push({
      roasTarget: r,
      spendCapCents: Math.round(s * 100),
      revenueCents: Math.round(s * r * 100),
      profitCents: Math.round(s * (r - 1) * 100),
      rankSurgeZone: r >= 1.8 && r <= 2.2,
    });
  }

  if (alpha0 * (1 - b) <= 1) {
    return {
      alpha0,
      beta: b,
      optimalRoas: 1,
      optimalSpendCents: 0,
      maxProfitCents: 0,
      scenarios,
      note: 'No interior optimum: α0·(1−β) ≤ 1, so marginal ROAS never exceeds 1. Do not scale paid spend under these returns.',
    };
  }

  const sStar = Math.pow(alpha0 * (1 - b), 1 / b);
  const rStar = 1 / (1 - b);
  return {
    alpha0,
    beta: b,
    optimalRoas: rStar,
    optimalSpendCents: Math.round(sStar * 100),
    maxProfitCents: Math.round(sStar * (rStar - 1) * 100),
    scenarios,
  };
}

/**
 * Proposition 1 — Acquisition leverage:
 *   E[ΔY] ≥ S_N · (α − 1) · Y, leverage ratio ≈ S_N / S_A.
 */
import type { LeverageResult, SobolResult } from '../types';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function computeLeverage(
  mrrCents: number,
  sobol: SobolResult,
  alpha: number,
): LeverageResult {
  const [ciLo, ciHi] = sobol.sNConfidenceInterval;
  const impact = (sN: number): number => clamp01(sN) * (alpha - 1) * mrrCents;

  const surface: LeverageResult['surface'] = [];
  for (let ai = 0; ai < 25; ai++) {
    const a = 1 + (49 * ai) / 24;
    for (let si = 0; si <= 20; si++) {
      const sN = si / 20;
      surface.push({ alpha: a, sN, impactCents: sN * (a - 1) * mrrCents });
    }
  }

  const mid = impact(sobol.sN);
  return {
    alpha,
    expectedImpactLowCents: impact(ciLo),
    expectedImpactMidCents: mid,
    expectedImpactHighCents: impact(ciHi),
    newMrrMidCents: mrrCents + mid,
    leverageRatio: sobol.sN / Math.max(sobol.sA, 0.001),
    seatLadderDominant: sobol.sN > 0.85,
    surface,
  };
}

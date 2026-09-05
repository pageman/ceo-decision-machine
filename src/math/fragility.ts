/**
 * Fragility score φ (paper Phase 7.3): equal-weight aggregation of the four
 * uncertainty sources; reduced 40% once pilot data exists.
 */
import type { FermiResult, SobolResult } from '../types';

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

export function computeFragility(
  sobol: SobolResult,
  fermi: FermiResult,
  pTeamReady: number,
  alphaPilot: number | null,
): number {
  const alphaUncertainty =
    alphaPilot === null ? 0.6 : Math.min(0.6, Math.max(0.05, Math.abs(2 - alphaPilot) / 4));
  const sNUncertainty = 1 - clamp01(sobol.sNConfidenceInterval[0]);
  const { p5, p50, p95 } = fermi.npvPercentiles;
  const valuationDispersion = clamp01((p95 - p5) / (Math.abs(p50) + 1));
  const teamUncertainty = 1 - clamp01(pTeamReady);

  let phi =
    0.25 * alphaUncertainty +
    0.25 * sNUncertainty +
    0.25 * valuationDispersion +
    0.25 * teamUncertainty;
  if (alphaPilot !== null) phi *= 0.6;
  return clamp01(phi);
}

/**
 * Decision rule engine (paper Phase 7.2):
 *   ACQUIRE iff [S_N > 0.85] ∧ [α_pilot > 2] ∧ [φ < 0.30] ∧ [VOI_max < ε]
 *   PILOT   iff VOI_max ≥ ε
 *   DEFER   otherwise
 */
import type { ConfidenceLevel, Decision, FermiResult, GeometryFamily, RungLevel } from '../types';

interface FactorProbs {
  pAdsScale: number;
  pSnDominant: number;
  pValuationAttractive: number;
  pTeamReady: number;
}

const FACTOR_REMEDIES: { key: keyof FactorProbs; remedy: string }[] = [
  {
    key: 'pAdsScale',
    remedy: 'Ad elasticity pilot ($5K/mo Meta ads, 90-day holdout market)',
  },
  {
    key: 'pSnDominant',
    remedy: 'Direct revenue data (Stripe / BIR OR) to tighten the Sobol confidence interval',
  },
  {
    key: 'pValuationAttractive',
    remedy: 'Revenue verification and comparable-acquisition benchmarking to narrow the Fermi band',
  },
  {
    key: 'pTeamReady',
    remedy: 'Team capability assessment and a key-hire plan',
  },
];

/** Value-of-information heuristic: worth of resolving the weakest decision factor. */
export function computeVoi(
  posterior: FactorProbs,
  fermi: FermiResult,
): { voiMaxCents: number; nextBestEvidence: string } {
  const weakest = FACTOR_REMEDIES.reduce((a, b) => (posterior[b.key] < posterior[a.key] ? b : a));
  let voi = Math.round(Math.abs(fermi.npvPercentiles.p50) * (1 - posterior[weakest.key]));
  if (posterior[weakest.key] < 0.5) voi = Math.max(voi, 500_000); // $5,000 floor
  return { voiMaxCents: voi, nextBestEvidence: weakest.remedy };
}

export function decide(
  sN: number,
  alphaPilot: number | null,
  phi: number,
  voiMaxCents: number,
  epsilonCents: number,
): Decision {
  if (
    sN > 0.85 &&
    alphaPilot !== null &&
    alphaPilot > 2 &&
    phi < 0.3 &&
    voiMaxCents < epsilonCents
  ) {
    return 'ACQUIRE';
  }
  if (voiMaxCents >= epsilonCents) return 'PILOT';
  return 'DEFER';
}

const fmtUsd = (cents: number): string =>
  '$' + Math.round(cents / 100).toLocaleString('en-US');

export function explainDecision(args: {
  decision: Decision;
  sN: number;
  alphaPilot: number | null;
  phi: number;
  voiMaxCents: number;
  epsilonCents: number;
  geometry: GeometryFamily;
}): string {
  const { decision, sN, alphaPilot, phi, voiMaxCents, epsilonCents, geometry } = args;
  const c1 = `seat-ladder geometry ${sN > 0.85 ? 'confirmed' : 'NOT confirmed'} (S_N = ${sN.toFixed(2)} vs threshold 0.85)`;
  const c2 =
    alphaPilot === null
      ? 'no pilot elasticity measured (α_pilot > 2 required)'
      : `pilot ad elasticity ${alphaPilot.toFixed(1)} ${alphaPilot > 2 ? 'exceeds' : 'does not exceed'} threshold 2`;
  const c3 = `fragility φ = ${phi.toFixed(2)} ${phi < 0.3 ? '<' : '≥'} 0.30`;
  const c4 = `VOI_max ${fmtUsd(voiMaxCents)} ${voiMaxCents < epsilonCents ? '<' : '≥'} ε ${fmtUsd(epsilonCents)}`;

  if (decision === 'ACQUIRE') {
    return `ACQUIRE recommended because: (1) ${c1}, (2) ${c2}, (3) ${c3}, (4) no high-value information remains (${c4}).`;
  }
  if (decision === 'PILOT') {
    return `PILOT recommended: the value of remaining information exceeds the cost of delay (${c4}). Current state: (1) ${c1}, (2) ${c2}, (3) ${c3}. Collect the next best evidence before committing (${geometry} geometry).`;
  }
  return `DEFER recommended: acquisition conditions are not met — ${c1}; ${c2}; ${c3}; ${c4}. Revisit once the failing conditions improve.`;
}

export function confidenceFromPhi(phi: number, rungLevel: RungLevel): ConfidenceLevel {
  if (phi < 0.3 && rungLevel === 'RUNG_2') return 'CERTAIN';
  if (phi < 0.5) return 'PROBABLE';
  if (phi < 0.7) return 'SPECULATIVE';
  return 'CONJECTURE';
}

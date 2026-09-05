/**
 * Bayesian factor posteriors (paper Phase 7.1).
 * pAdsScale starts at a weak Beta(2,8)-mean prior (single Outrank precedent) and is
 * updated heuristically once a measured pilot elasticity exists.
 */
import type { Company, EvidenceItem, FermiResult, SobolResult } from '../types';

export interface Posterior {
  pAdsScale: number;
  pSnDominant: number;
  pValuationAttractive: number;
  pTeamReady: number;
  pAcquire: number;
  alphaPilot: number | null;
}

export function computePosterior(
  company: Company,
  sobol: SobolResult,
  fermi: FermiResult,
  evidence: EvidenceItem[],
): Posterior {
  const pilotItem = evidence
    .filter(
      (e) =>
        (e.sourceType === 'pilot' || e.sourceType === 'experimental') &&
        typeof e.dataPayload.alphaPilot === 'number',
    )
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))[0];
  const alphaPilot = pilotItem ? (pilotItem.dataPayload.alphaPilot as number) : null;

  // Heuristic mapping from measured elasticity to P(ads scale).
  const pAdsScale =
    alphaPilot === null
      ? 0.2
      : alphaPilot >= 2
        ? 0.8
        : alphaPilot >= 1.5
          ? 0.55
          : alphaPilot >= 1.2
            ? 0.35
            : 0.1;

  const [ciLo, ciHi] = sobol.sNConfidenceInterval;
  const pSnDominant = ciLo > 0.85 ? 0.95 : ciHi < 0.85 ? 0.05 : 0.5;

  const pValuationAttractive = fermi.pPaybackUnder36Months;
  const pTeamReady = Math.min(1, Math.max(0, company.teamReadinessScore / 100));

  return {
    pAdsScale,
    pSnDominant,
    pValuationAttractive,
    pTeamReady,
    pAcquire: pAdsScale * pSnDominant * pValuationAttractive * pTeamReady,
    alphaPilot,
  };
}

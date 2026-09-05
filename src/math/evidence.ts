/**
 * Evidence credibility scoring (paper Phase 4.2):
 * tier weight × freshness decay × cross-validation boost × verification boost, clamped to [0,1].
 */
import type { EvidenceItem } from '../types';

const TIER_WEIGHTS: Record<number, number> = {
  0: 1.0,
  1: 0.85,
  2: 0.6,
  3: 0.45,
  4: 0.35,
  5: 0.2,
  6: 0.4,
  7: 0.95,
};

const MONTH_MS = 30.44 * 24 * 3600 * 1000;

export function computeCredibilityScore(
  item: EvidenceItem,
  allCompanyEvidence: EvidenceItem[],
): number {
  let score = TIER_WEIGHTS[item.tier] ?? 0.2;
  const ageMonths = Math.max(0, (Date.now() - new Date(item.collectedAt).getTime()) / MONTH_MS);
  score *= Math.pow(0.95, ageMonths);
  const directCount = allCompanyEvidence.filter((e) => e.tier <= 3).length;
  if (directCount >= 3) score *= 1.2;
  if (item.verified) score *= 1.15;
  return Math.min(1, Math.max(0, score));
}

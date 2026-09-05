/**
 * Revenue geometry classifier (paper Section 2.1).
 * Sub-$20K MRR SaaS is seat-ladder with a 0.95 prior unless strong contrary signals exist.
 */
import type { Company, GeometryFamily, MrrSanityCheck, RevenueModelType } from '../types';

const OVERRIDE_MAP: Record<RevenueModelType, GeometryFamily> = {
  seat_ladder: 'SEAT_LADDER',
  volume_attach: 'VOLUME_ATTACH',
  usage_based: 'USAGE_BASED',
  hybrid: 'HYBRID',
};

export function classifyGeometry(company: Company): {
  geometry: GeometryFamily;
  confidence: number;
} {
  if (company.revenueModelType) {
    return { geometry: OVERRIDE_MAP[company.revenueModelType], confidence: 1.0 };
  }

  const seats = Math.max(company.seatCount, 0);
  const tx = company.transactionVolume ?? 0;
  const hasUsage = (company.usageMetricsDescription ?? '').trim().length > 3;

  const volumeDominant = tx > 0 && tx > Math.max(seats, 1) * 20;
  const usageDominant = hasUsage && seats < 10;

  if (volumeDominant && usageDominant) return { geometry: 'HYBRID', confidence: 0.6 };
  if (volumeDominant) return { geometry: 'VOLUME_ATTACH', confidence: 0.8 };
  if (usageDominant) return { geometry: 'USAGE_BASED', confidence: 0.8 };

  if (company.mrrCents < 2_000_000) {
    return { geometry: 'SEAT_LADDER', confidence: 0.95 };
  }
  if (seats > 0) return { geometry: 'SEAT_LADDER', confidence: 0.7 };
  return { geometry: 'HYBRID', confidence: 0.5 };
}

/** Seat-ladder sanity check: Y = N × A × (1 − c) must land within 5% of reported MRR. */
export function validateSeatLadder(company: Company): MrrSanityCheck {
  const computed = company.seatCount * company.arpuCents * (1 - company.churnRate);
  const reported = company.mrrCents;
  const deviationPct =
    reported > 0 ? Math.abs(computed - reported) / reported : computed === 0 ? 0 : Infinity;
  return {
    computedMrrCents: Math.round(computed),
    reportedMrrCents: reported,
    deviationPct,
    withinTolerance: deviationPct <= 0.05,
  };
}

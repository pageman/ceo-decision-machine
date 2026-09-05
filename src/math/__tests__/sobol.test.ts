import { describe, expect, it } from 'vitest';
import type { Company } from '../../types';
import { computeSobol } from '../sobol';

export const fixtureCompany: Company = {
  id: 'c1',
  name: 'TestCo',
  industryVertical: 'B2B SaaS',
  countryCode: 'PH',
  mrrCents: 950_000, // matches N×A×(1−c) = 200 × $50 × 0.95
  arpuCents: 5000,
  seatCount: 200,
  churnRate: 0.05,
  pricingTiers: [
    { name: 'Basic', priceCents: 4000 },
    { name: 'Pro', priceCents: 8000 },
  ],
  targetAudience: 'global',
  teamReadinessScore: 70,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('computeSobol (Saltelli scheme)', () => {
  it('keeps indices within [0,1] and ranks N dominant under seat-ladder priors', () => {
    const res = computeSobol(fixtureCompany, 'SEAT_LADDER', 42);
    expect(res.indices).toHaveLength(3);
    for (const ix of res.indices) {
      expect(ix.firstOrder).toBeGreaterThanOrEqual(0);
      expect(ix.firstOrder).toBeLessThanOrEqual(1);
      expect(ix.totalOrder).toBeGreaterThanOrEqual(0);
      expect(ix.firstOrderCI[0]).toBeLessThanOrEqual(ix.firstOrderCI[1]);
    }
    // With σ_N = 0.45, σ_A = 0.15, churn ~ Beta(mean 5%): N carries the variance.
    expect(res.sN).toBeGreaterThan(res.sA);
    expect(res.sN).toBeGreaterThan(res.sC);
    expect(res.sN).toBeGreaterThan(0.75);
    expect(res.sampleSize).toBe(4096);
    expect(typeof res.interactionDetected).toBe('boolean');
  });

  it('is deterministic for a fixed seed', () => {
    const a = computeSobol(fixtureCompany, 'SEAT_LADDER', 42);
    const b = computeSobol(fixtureCompany, 'SEAT_LADDER', 42);
    expect(a.sN).toBe(b.sN);
    expect(a.sNConfidenceInterval).toEqual(b.sNConfidenceInterval);
  });
});

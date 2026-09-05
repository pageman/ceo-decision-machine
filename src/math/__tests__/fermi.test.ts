import { describe, expect, it } from 'vitest';
import { computeFermi, defaultFermiParams } from '../fermi';
import { fixtureCompany } from './sobol.test';

describe('computeFermi Monte Carlo', () => {
  it('converges to the exact deterministic value for degenerate parameters', () => {
    const params = {
      ...defaultFermiParams(fixtureCompany),
      mrrLowCents: 1_000_000,
      mrrMidCents: 1_000_000,
      mrrHighCents: 1_000_000,
      multipleLow: 4,
      multipleMid: 4,
      multipleHigh: 4,
      targetMrrGrowthLow: 1.8,
      targetMrrGrowthMid: 1.8,
      targetMrrGrowthHigh: 1.8,
      netMarginLow: 0.25,
      netMarginMid: 0.25,
      netMarginHigh: 0.25,
    };
    const res = computeFermi(fixtureCompany, params, 7, 2000);
    // price = 1,000,000 × 12 × 4 = 48,000,000; monthlyNet = 1,000,000 × 1.8 × 0.25 = 450,000
    expect(res.acquisitionPriceMidCents).toBe(48_000_000);
    expect(res.paybackMonthsMid).toBeCloseTo(48_000_000 / 450_000, 1);
    expect(res.pPaybackUnder36Months).toBe(0);
    const total = res.paybackHistogram.reduce((acc, b) => acc + b.count, 0);
    expect(total).toBe(2000);
  });

  it('is reproducible for a fixed seed and produces ordered percentiles', () => {
    const params = defaultFermiParams(fixtureCompany);
    const a = computeFermi(fixtureCompany, params, 99);
    const b = computeFermi(fixtureCompany, params, 99);
    expect(a.paybackMonthsMid).toBe(b.paybackMonthsMid);
    expect(a.npvPercentiles.p5).toBeLessThanOrEqual(a.npvPercentiles.p50);
    expect(a.npvPercentiles.p50).toBeLessThanOrEqual(a.npvPercentiles.p95);
    expect(a.paybackMonthsLow).toBeLessThanOrEqual(a.paybackMonthsMid);
    expect(a.paybackMonthsMid).toBeLessThanOrEqual(a.paybackMonthsHigh);
    expect(a.pPaybackUnder36Months).toBeGreaterThanOrEqual(0);
    expect(a.pPaybackUnder36Months).toBeLessThanOrEqual(1);
  });

  it('flags CSM-ratio violations and MRR spread', () => {
    const weird = { ...fixtureCompany, employeeCount: 10 }; // 20 seats/employee, outside [100,200]
    const res = computeFermi(weird, defaultFermiParams(weird), 1, 500);
    expect(res.constraintWarnings.some((w) => w.includes('CSM ratio'))).toBe(true);
  });
});

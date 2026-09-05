/**
 * Fermi valuation engine (paper Phase 5): parameter triangulation + 10,000-run Monte Carlo.
 * Per run: price = MRR × 12 × multiple; monthlyNet = MRR × growth × margin;
 * payback = price / monthlyNet; NPV = Σ monthlyNet/(1+0.1/12)^t − price over 36 months.
 */
import type { Company, FermiParameters, FermiResult } from '../types';
import { defaultRng } from './rng';
import { sampleTriangular } from './distributions';

export function defaultFermiParams(company: Company): FermiParameters {
  const m = company.mrrCents;
  const ad = company.adSpendBudgetCents ?? 0;
  return {
    mrrLowCents: Math.round(m * 0.7),
    mrrMidCents: m,
    mrrHighCents: Math.round(m * 1.3),
    multipleLow: 3,
    multipleMid: 4,
    multipleHigh: 5,
    adSpendLowCents: Math.round(ad * 0.5),
    adSpendMidCents: ad,
    adSpendHighCents: Math.round(ad * 1.5),
    targetMrrGrowthLow: 1.2,
    targetMrrGrowthMid: 1.8,
    targetMrrGrowthHigh: 3.0,
    netMarginLow: 0.1,
    netMarginMid: 0.25,
    netMarginHigh: 0.4,
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

export function computeFermi(
  company: Company,
  params: FermiParameters,
  seed?: number,
  iterations = 10_000,
): FermiResult {
  const rng = defaultRng(seed);
  const paybacks: number[] = new Array(iterations);
  const npvs: number[] = new Array(iterations);
  let under36 = 0;
  const discountFactor = 1 + 0.1 / 12;

  for (let i = 0; i < iterations; i++) {
    const mrr = sampleTriangular(rng, params.mrrLowCents, params.mrrMidCents, params.mrrHighCents);
    const multiple = sampleTriangular(rng, params.multipleLow, params.multipleMid, params.multipleHigh);
    const growth = sampleTriangular(
      rng,
      params.targetMrrGrowthLow,
      params.targetMrrGrowthMid,
      params.targetMrrGrowthHigh,
    );
    const margin = sampleTriangular(rng, params.netMarginLow, params.netMarginMid, params.netMarginHigh);

    const price = mrr * 12 * multiple;
    const monthlyNet = mrr * growth * margin;
    const payback = monthlyNet > 1e-9 ? price / monthlyNet : 1200;
    paybacks[i] = payback;
    if (payback < 36) under36++;

    let npv = -price;
    let df = 1;
    for (let t = 0; t < 36; t++) {
      df *= discountFactor;
      npv += monthlyNet / df;
    }
    npvs[i] = npv;
  }

  paybacks.sort((a, b) => a - b);
  npvs.sort((a, b) => a - b);

  const bins = 20;
  const maxMonths = 120;
  const binWidth = maxMonths / bins;
  const histogram = Array.from({ length: bins }, (_, i) => ({
    binStartMonths: i * binWidth,
    binEndMonths: (i + 1) * binWidth,
    count: 0,
  }));
  for (const p of paybacks) {
    const bin = Math.min(bins - 1, Math.floor(Math.min(p, maxMonths) / binWidth));
    histogram[bin].count++;
  }

  // MRR triangulation (paper 5.1.1): direct vs computed vs employee-inferred.
  const direct = company.mrrCents;
  const computed = company.seatCount * company.arpuCents * (1 - company.churnRate);
  const inferred =
    company.employeeCount && company.employeeCount > 0
      ? company.employeeCount * 150 * company.arpuCents
      : null;
  const estimates = [direct, computed, ...(inferred !== null ? [inferred] : [])];
  const midEst = estimates.reduce((a, b) => a + b, 0) / estimates.length;
  const spreadPct =
    midEst > 0 ? (Math.max(...estimates) - Math.min(...estimates)) / midEst : 0;

  const warnings: string[] = [];
  if (company.employeeCount && company.employeeCount > 0) {
    const ratio = company.seatCount / company.employeeCount;
    if (ratio < 100 || ratio > 200) {
      warnings.push(
        `CSM ratio outside [1:100, 1:200]: ${Math.round(ratio)} seats per employee — verify seat count or team size.`,
      );
    }
  }
  const inversions: string[] = [];
  if (params.mrrLowCents > params.mrrHighCents) inversions.push('MRR');
  if (params.multipleLow > params.multipleHigh) inversions.push('multiple');
  if (params.targetMrrGrowthLow > params.targetMrrGrowthHigh) inversions.push('target growth');
  if (params.netMarginLow > params.netMarginHigh) inversions.push('net margin');
  if (inversions.length > 0) {
    warnings.push(`Parameter bounds inverted (low > high): ${inversions.join(', ')}.`);
  }
  if (company.churnRate < 0 || company.churnRate > 1) {
    warnings.push('Churn rate outside [0, 1] — check input data.');
  }
  if (spreadPct > 0.3) {
    warnings.push('MRR uncertain — wide feasible region (triangulation spread > 30%).');
  }

  return {
    params,
    acquisitionPriceLowCents: Math.round(params.mrrLowCents * 12 * params.multipleLow),
    acquisitionPriceMidCents: Math.round(params.mrrMidCents * 12 * params.multipleMid),
    acquisitionPriceHighCents: Math.round(params.mrrHighCents * 12 * params.multipleHigh),
    paybackMonthsLow: percentile(paybacks, 0.05),
    paybackMonthsMid: percentile(paybacks, 0.5),
    paybackMonthsHigh: percentile(paybacks, 0.95),
    pPaybackUnder36Months: under36 / iterations,
    npvPercentiles: {
      p5: percentile(npvs, 0.05),
      p50: percentile(npvs, 0.5),
      p95: percentile(npvs, 0.95),
    },
    paybackHistogram: histogram,
    mrrEstimates: {
      directCents: direct,
      computedCents: Math.round(computed),
      inferredCents: inferred !== null ? Math.round(inferred) : null,
      spreadPct,
    },
    constraintWarnings: warnings,
    iterations,
  };
}

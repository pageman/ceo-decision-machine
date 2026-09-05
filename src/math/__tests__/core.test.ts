import { describe, expect, it } from 'vitest';
import type { EvidenceItem, SobolResult } from '../../types';
import { computeLeverage } from '../leverage';
import { decide, explainDecision, confidenceFromPhi, computeVoi } from '../decision';
import { classifyGeometry, validateSeatLadder } from '../geometry';
import { computeRoas } from '../roas';
import { computeCredibilityScore } from '../evidence';
import { computePosterior } from '../posterior';
import { computeFragility } from '../fragility';
import { runStressTests } from '../stressTests';
import { buildCeoAnswers } from '../questions';
import { computeFermi, defaultFermiParams } from '../fermi';
import { computeSobol } from '../sobol';
import { fixtureCompany } from './sobol.test';

const fakeSobol = (sN: number, ci: [number, number]): SobolResult => ({
  geometry: 'SEAT_LADDER',
  indices: [
    { name: 'N', firstOrder: sN, totalOrder: sN, firstOrderCI: ci },
    { name: 'A', firstOrder: 0.05, totalOrder: 0.05, firstOrderCI: [0.04, 0.06] },
    { name: 'C', firstOrder: 0.01, totalOrder: 0.01, firstOrderCI: [0, 0.02] },
  ],
  sN,
  sA: 0.05,
  sC: 0.01,
  sNConfidenceInterval: ci,
  interactionDetected: false,
  sampleSize: 4096,
  modelVersion: 'test',
});

const evidenceItem = (over: Partial<EvidenceItem>): EvidenceItem => ({
  id: over.id ?? 'e1',
  companyId: 'c1',
  tier: 2,
  sourceType: 'linkedin',
  title: 'item',
  dataPayload: {},
  credibilityScore: 0,
  collectedAt: new Date().toISOString(),
  verified: false,
  ...over,
});

describe('Proposition 1 — acquisition leverage', () => {
  it('computes E[ΔY] ≥ S_N·(α−1)·Y with known values', () => {
    // Y = $10,000 (1,000,000¢), S_N = 0.90, α = 1.5 → impact = 0.9×0.5×1,000,000 = 450,000¢
    const res = computeLeverage(1_000_000, fakeSobol(0.9, [0.85, 0.95]), 1.5);
    expect(res.expectedImpactMidCents).toBeCloseTo(450_000, 6);
    expect(res.newMrrMidCents).toBeCloseTo(1_450_000, 6);
    expect(res.leverageRatio).toBeCloseTo(18, 6);
    expect(res.seatLadderDominant).toBe(true);
    expect(res.surface.length).toBe(25 * 21);
  });
});

describe('decision rule (MDL)', () => {
  it('ACQUIREs only when all four conditions hold', () => {
    expect(decide(0.9, 2.3, 0.2, 1_000, 5_000_000)).toBe('ACQUIRE');
    expect(decide(0.8, 2.3, 0.2, 1_000, 5_000_000)).toBe('DEFER'); // S_N fails
    expect(decide(0.9, 1.5, 0.2, 1_000, 5_000_000)).toBe('DEFER'); // alpha fails
    expect(decide(0.9, 2.3, 0.5, 1_000, 5_000_000)).toBe('DEFER'); // phi fails
  });
  it('never ACQUIREs without pilot elasticity', () => {
    expect(decide(0.95, null, 0.1, 1_000, 5_000_000)).toBe('DEFER');
  });
  it('routes to PILOT when VOI_max ≥ ε', () => {
    expect(decide(0.9, 2.3, 0.2, 6_000_000, 5_000_000)).toBe('PILOT');
  });
  it('explains the decision with concrete numbers', () => {
    const text = explainDecision({
      decision: 'ACQUIRE',
      sN: 0.91,
      alphaPilot: 2.3,
      phi: 0.22,
      voiMaxCents: 1_200_000,
      epsilonCents: 5_000_000,
      geometry: 'SEAT_LADDER',
    });
    expect(text).toContain('ACQUIRE');
    expect(text).toContain('0.91');
    expect(text).toContain('2.3');
  });
  it('maps φ to confidence levels', () => {
    expect(confidenceFromPhi(0.2, 'RUNG_2')).toBe('CERTAIN');
    expect(confidenceFromPhi(0.2, 'RUNG_1')).toBe('PROBABLE');
    expect(confidenceFromPhi(0.6, 'RUNG_1')).toBe('SPECULATIVE');
    expect(confidenceFromPhi(0.9, 'RUNG_1')).toBe('CONJECTURE');
  });
  it('computes VOI with the ad-pilot remedy as weakest factor', () => {
    const fermi = computeFermi(fixtureCompany, defaultFermiParams(fixtureCompany), 3, 1000);
    const voi = computeVoi(
      { pAdsScale: 0.2, pSnDominant: 0.95, pValuationAttractive: 0.8, pTeamReady: 0.7 },
      fermi,
    );
    expect(voi.nextBestEvidence).toContain('elasticity');
    expect(voi.voiMaxCents).toBeGreaterThan(0);
  });
});

describe('geometry classifier', () => {
  it('defaults sub-$20K MRR to SEAT_LADDER with 0.95 prior', () => {
    const g = classifyGeometry(fixtureCompany);
    expect(g.geometry).toBe('SEAT_LADDER');
    expect(g.confidence).toBe(0.95);
  });
  it('detects volume-attach dominance', () => {
    const g = classifyGeometry({ ...fixtureCompany, transactionVolume: 50_000, seatCount: 200 });
    expect(g.geometry).toBe('VOLUME_ATTACH');
  });
  it('respects the user override with confidence 1.0', () => {
    const g = classifyGeometry({ ...fixtureCompany, revenueModelType: 'usage_based' });
    expect(g.geometry).toBe('USAGE_BASED');
    expect(g.confidence).toBe(1.0);
  });
  it('validates the seat-ladder identity within 5%', () => {
    const check = validateSeatLadder(fixtureCompany);
    expect(check.computedMrrCents).toBe(950_000);
    expect(check.withinTolerance).toBe(true);
  });
});

describe('Proposition 3 — ROAS ceiling', () => {
  it('matches the closed-form optimum', () => {
    const res = computeRoas(3, 0.3);
    expect(res.optimalRoas).toBeCloseTo(1 / 0.7, 6);
    expect(res.optimalSpendCents).toBeCloseTo(Math.pow(2.1, 1 / 0.3) * 100, 0);
    expect(res.maxProfitCents).toBeGreaterThan(0);
    expect(res.scenarios.some((s) => s.rankSurgeZone)).toBe(true);
  });
  it('handles the boundary case', () => {
    const res = computeRoas(1, 0.5); // α0·(1−β) = 0.5 ≤ 1
    expect(res.note).toBeDefined();
    expect(res.maxProfitCents).toBe(0);
  });
});

describe('evidence credibility', () => {
  it('orders tiers T0 > T5 at equal age', () => {
    const t0 = computeCredibilityScore(evidenceItem({ tier: 0 }), []);
    const t5 = computeCredibilityScore(evidenceItem({ tier: 5 }), []);
    expect(t0).toBeGreaterThan(t5);
  });
  it('applies the verified boost and freshness decay', () => {
    const fresh = computeCredibilityScore(evidenceItem({ tier: 2 }), []);
    const verified = computeCredibilityScore(evidenceItem({ tier: 2, verified: true }), []);
    expect(verified).toBeGreaterThan(fresh);
    const old = computeCredibilityScore(
      evidenceItem({ tier: 2, collectedAt: new Date(Date.now() - 400 * 24 * 3600 * 1000).toISOString() }),
      [],
    );
    expect(old).toBeLessThan(fresh);
  });
});

describe('posterior + fragility', () => {
  const sobol = fakeSobol(0.9, [0.87, 0.93]);
  const fermi = computeFermi(fixtureCompany, defaultFermiParams(fixtureCompany), 5, 1000);

  it('derives pSnDominant from the CI rule', () => {
    const p = computePosterior(fixtureCompany, sobol, fermi, []);
    expect(p.pSnDominant).toBe(0.95); // CI fully above 0.85
    expect(p.pAdsScale).toBe(0.2); // no pilot → prior
    expect(p.alphaPilot).toBeNull();
    expect(p.pAcquire).toBeCloseTo(
      p.pAdsScale * p.pSnDominant * p.pValuationAttractive * p.pTeamReady,
      10,
    );
  });
  it('picks up pilot elasticity from evidence', () => {
    const p = computePosterior(fixtureCompany, sobol, fermi, [
      evidenceItem({ sourceType: 'pilot', dataPayload: { alphaPilot: 2.4 } }),
    ]);
    expect(p.alphaPilot).toBe(2.4);
    expect(p.pAdsScale).toBe(0.8);
  });
  it('keeps φ in [0,1] and reduces it with pilot data', () => {
    const without = computeFragility(sobol, fermi, 0.7, null);
    const withPilot = computeFragility(sobol, fermi, 0.7, 2.4);
    for (const phi of [without, withPilot]) {
      expect(phi).toBeGreaterThanOrEqual(0);
      expect(phi).toBeLessThanOrEqual(1);
    }
    expect(withPilot).toBeLessThan(without);
  });
});

describe('stress tests (paper Table 5)', () => {
  const sobol = computeSobol(fixtureCompany, 'SEAT_LADDER', 11, 1024);
  const fermi = computeFermi(fixtureCompany, defaultFermiParams(fixtureCompany), 5, 2000);

  it('returns exactly 10 well-formed results', () => {
    const results = runStressTests({ company: fixtureCompany, sobol, fermi, alphaPilot: null, evidence: [] });
    expect(results).toHaveLength(10);
    for (const r of results) {
      expect(r.failureMode.length).toBeGreaterThan(0);
      expect(r.systemResponse.length).toBeGreaterThan(0);
      expect(r.mitigation.length).toBeGreaterThan(0);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(r.riskLevel);
      expect(typeof r.passed).toBe('boolean');
    }
  });
  it('test 10 passes iff causal evidence exists', () => {
    const noCausal = runStressTests({ company: fixtureCompany, sobol, fermi, alphaPilot: null, evidence: [] });
    expect(noCausal.find((t) => t.testNumber === 10)!.passed).toBe(false);
    const causal = runStressTests({
      company: fixtureCompany,
      sobol,
      fermi,
      alphaPilot: 2.4,
      evidence: [evidenceItem({ sourceType: 'pilot', dataPayload: { alphaPilot: 2.4 } })],
    });
    expect(causal.find((t) => t.testNumber === 10)!.passed).toBe(true);
  });
  it('test 5 flags >20% MRR discrepancies from direct sources', () => {
    const results = runStressTests({
      company: fixtureCompany,
      sobol,
      fermi,
      alphaPilot: null,
      evidence: [
        evidenceItem({ tier: 0, sourceType: 'stripe_direct', dataPayload: { reportedMrrCents: 500_000 } }),
      ],
    });
    const t5 = results.find((t) => t.testNumber === 5)!;
    expect(t5.passed).toBe(false);
    expect(t5.riskLevel).toBe('HIGH');
  });
});

describe('12 CEO questions', () => {
  it('builds 12 unique, well-formed answers', () => {
    const sobol = computeSobol(fixtureCompany, 'SEAT_LADDER', 11, 1024);
    const fermi = computeFermi(fixtureCompany, defaultFermiParams(fixtureCompany), 5, 1000);
    const stressTests = runStressTests({ company: fixtureCompany, sobol, fermi, alphaPilot: null, evidence: [] });
    const answers = buildCeoAnswers({
      company: fixtureCompany,
      geometry: 'SEAT_LADDER',
      sobol,
      fermi,
      stressTests,
      decision: 'PILOT',
      phi: 0.4,
      evidence: [],
      pTeamReady: 0.7,
    });
    expect(answers).toHaveLength(12);
    expect(new Set(answers.map((a) => a.questionNumber)).size).toBe(12);
    for (const a of answers) {
      expect(a.question.length).toBeGreaterThan(0);
      expect(a.answer.length).toBeGreaterThan(0);
      expect(['CERTAIN', 'PROBABLE', 'SPECULATIVE', 'CONJECTURE']).toContain(a.confidence);
      expect(a.autoPopulated).toBe(true);
    }
  });
});

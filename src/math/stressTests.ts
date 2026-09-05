/**
 * TrustMRR stress tests (paper Table 5). Ten deterministic what-if modules;
 * each recomputes the deal economics under a specific failure mode.
 */
import type {
  Company,
  EvidenceItem,
  FermiResult,
  SobolResult,
  StressTestResult,
} from '../types';

interface StressInput {
  company: Company;
  sobol: SobolResult;
  fermi: FermiResult;
  alphaPilot: number | null;
  evidence: EvidenceItem[];
}

const mo = (x: number): string => `${x.toFixed(0)} months`;

export function runStressTests(input: StressInput): StressTestResult[] {
  const { company, sobol, fermi, alphaPilot, evidence } = input;
  const paybackMid = fermi.paybackMonthsMid;
  const results: StressTestResult[] = [];

  // 1 — Elasticity below 1.5: assume α = 1.2 vs the α = 2 baseline of the thesis.
  {
    const scaled = paybackMid / 0.6; // net scales with 1.2/2
    const passed = scaled <= 36;
    results.push({
      testNumber: 1,
      name: 'Elasticity below 1.5',
      category: 'elasticity',
      failureMode: 'True ad elasticity is 1.2, not the assumed 2.0.',
      systemResponse: `Payback stretches from ${mo(paybackMid)} to ~${mo(scaled)} (cf. the paper's 96-month DEFER precedent).`,
      riskLevel: passed ? 'LOW' : 'HIGH',
      passed,
      mitigation: 'Run an elasticity pilot before committing; size the offer to the α = 1.2 downside.',
    });
  }

  // 2 — Non-stationary elasticity: α(t) = α0 · e^(−0.05t) ⇒ ≈26% average decay over 12 months.
  {
    const decayed = paybackMid / 0.74;
    const passed = decayed <= 48;
    results.push({
      testNumber: 2,
      name: 'Non-stationary elasticity',
      category: 'elasticity',
      failureMode: 'Ad elasticity decays ~5%/month as audiences saturate.',
      systemResponse: `Effective payback lengthens to ~${mo(decayed)} under temporal decay; re-estimate monthly.`,
      riskLevel: passed ? 'MEDIUM' : 'HIGH',
      passed,
      mitigation: 'Re-fit elasticity monthly during the pilot; refresh creative to counter fatigue.',
    });
  }

  // 3 — Meta ad account ban.
  {
    const exposed = sobol.sN > 0.85 && alphaPilot === null;
    results.push({
      testNumber: 3,
      name: 'Meta ad account ban',
      category: 'platform',
      failureMode: 'Primary paid channel suspended; paid traffic drops to zero.',
      systemResponse: exposed
        ? 'Seat-ladder thesis depends on an untested single ad channel — revenue-at-risk is existential.'
        : 'Channel dependence exists but elasticity has been measured; backup-account ROI is estimable.',
      riskLevel: exposed ? 'HIGH' : 'MEDIUM',
      passed: !exposed,
      mitigation: 'Maintain a backup ad account and a second channel (Google/TikTok) before scaling.',
    });
  }

  // 4 — VSL autoplay disabled: −60% conversion.
  {
    const degraded = paybackMid / 0.4;
    const passed = degraded <= 72;
    results.push({
      testNumber: 4,
      name: 'VSL autoplay disabled',
      category: 'platform',
      failureMode: 'Browser/platform change disables video autoplay; conversion falls 60%.',
      systemResponse: `Effective payback degrades to ~${mo(degraded)}; text-fallback funnel must be tested.`,
      riskLevel: 'MEDIUM',
      passed,
      mitigation: 'Build and A/B a text/static fallback funnel before acquisition.',
    });
  }

  // 5 — Fabricated revenue: cross-check Tier ≤1 sources against reported MRR.
  {
    const direct = evidence.filter(
      (e) => e.tier <= 1 && typeof e.dataPayload.reportedMrrCents === 'number',
    );
    let worst = 0;
    for (const e of direct) {
      const seen = e.dataPayload.reportedMrrCents as number;
      if (company.mrrCents > 0) {
        worst = Math.max(worst, Math.abs(seen - company.mrrCents) / company.mrrCents);
      }
    }
    const fraudFlag = direct.length > 0 && worst > 0.2;
    results.push({
      testNumber: 5,
      name: 'Fabricated revenue',
      category: 'validation',
      failureMode: 'Seller-reported MRR does not match payment-processor records.',
      systemResponse:
        direct.length === 0
          ? 'No Tier-0/1 revenue evidence on file — fabrication cannot be ruled out.'
          : fraudFlag
            ? `Stripe/source MRR diverges from claimed MRR by ${(worst * 100).toFixed(0)}% (> 20% threshold) — fraud risk.`
            : `Direct sources agree with reported MRR within ${(worst * 100).toFixed(0)}%.`,
      riskLevel: fraudFlag ? 'HIGH' : 'MEDIUM',
      passed: !fraudFlag,
      mitigation: 'Require Stripe read-only access or BIR ORs before any offer; re-price on verified numbers.',
    });
  }

  // 6 — Technical debt: +3 months to payback.
  {
    const delayed = paybackMid + 3;
    const passed = delayed <= 36;
    results.push({
      testNumber: 6,
      name: 'Technical debt',
      category: 'target',
      failureMode: 'Hidden codebase debt delays the growth plan by a quarter.',
      systemResponse: `Payback extends from ${mo(paybackMid)} to ${mo(delayed)}.`,
      riskLevel: passed ? 'LOW' : 'MEDIUM',
      passed,
      mitigation: 'CTO audit checkpoint before close; escrow part of the price against migration milestones.',
    });
  }

  // 7 — Churn spike post-acquisition: churn doubles.
  {
    const c = Math.min(0.49, Math.max(0, company.churnRate));
    const netFactor = (1 - 2 * c) / (1 - c); // revenue base shrinks
    const spiked = netFactor > 0 ? paybackMid / netFactor : 1200;
    const passed = spiked <= 36;
    results.push({
      testNumber: 7,
      name: 'Churn spike post-acquisition',
      category: 'target',
      failureMode: 'Churn doubles to 2× baseline after ownership transfer.',
      systemResponse: `Monthly churn ${(c * 100).toFixed(1)}% → ${(2 * c * 100).toFixed(1)}% pushes payback to ~${mo(spiked)} and cuts LTV proportionally.`,
      riskLevel: passed ? 'MEDIUM' : 'HIGH',
      passed,
      mitigation: '30-day retention cohort study pre-close; founder earn-out tied to retention.',
    });
  }

  // 8 — Competitor copies: α −30% after month 6 ⇒ ~15% year-1 net reduction.
  {
    const slowed = paybackMid / 0.85;
    const passed = slowed <= 48;
    results.push({
      testNumber: 8,
      name: 'Competitor copies the play',
      category: 'market',
      failureMode: 'A competitor replicates the ad playbook; elasticity falls 30% after month 6.',
      systemResponse: `First-mover advantage decays; effective payback ~${mo(slowed)}.`,
      riskLevel: 'MEDIUM',
      passed,
      mitigation: 'Bank the first-mover window: front-load spend in months 1–6 and build switching costs.',
    });
  }

  // 9 — Ad cost inflation: CPM +50% ⇒ effective ROAS ÷ 1.5.
  {
    const inflated = paybackMid * 1.5;
    const passed = inflated <= 36;
    results.push({
      testNumber: 9,
      name: 'Ad cost inflation',
      category: 'market',
      failureMode: 'CPMs inflate 50% over 12 months, compressing ROAS.',
      systemResponse: `ROAS compression pushes payback to ~${mo(inflated)}.`,
      riskLevel: passed ? 'MEDIUM' : 'HIGH',
      passed,
      mitigation: 'Lock in learnings at current CPMs; diversify into lower-CPM geographies (e.g. PH audiences).',
    });
  }

  // 10 — Confounded growth: causal attribution requires Rung-2 evidence.
  {
    const hasCausal = evidence.some(
      (e) => e.sourceType === 'pilot' || e.sourceType === 'experimental',
    );
    results.push({
      testNumber: 10,
      name: 'Confounded growth',
      category: 'validation',
      failureMode: 'Observed growth correlates with, but is not caused by, ad spend.',
      systemResponse: hasCausal
        ? 'Pilot/experimental evidence exists — causal attribution is supported (Rung 2).'
        : 'No holdout or experimental data — attribution is observational only (Rung 1).',
      riskLevel: hasCausal ? 'LOW' : 'MEDIUM',
      passed: hasCausal,
      mitigation: 'Run a controlled holdout (Market A with ads, Market B without) before claiming causation.',
    });
  }

  return results;
}

/**
 * The 12 CEO Questions (paper Table 4) — auto-populated from the analysis.
 */
import type {
  CeoQuestionAnswer,
  Company,
  Decision,
  EvidenceItem,
  FermiResult,
  GeometryFamily,
  SobolResult,
  StressTestResult,
} from '../types';
import type { ConfidenceLevel } from '../types';

interface QuestionsInput {
  company: Company;
  geometry: GeometryFamily;
  sobol: SobolResult;
  fermi: FermiResult;
  stressTests: StressTestResult[];
  decision: Decision;
  phi: number;
  evidence: EvidenceItem[];
  pTeamReady: number;
}

const usd = (cents: number): string => '$' + Math.round(cents / 100).toLocaleString('en-US');

const DRIVER_LABEL: Record<string, string> = {
  N: 'seat count (volume of accounts)',
  A: 'ARPU (pricing / monetization)',
  C: 'churn (retention)',
};

export function buildCeoAnswers(input: QuestionsInput): CeoQuestionAnswer[] {
  const { company, geometry, sobol, fermi, stressTests, decision, phi, evidence, pTeamReady } =
    input;

  const dominant = [...sobol.indices].sort((a, b) => b.firstOrder - a.firstOrder)[0];
  const seatDominant = sobol.sN > 0.85;
  const failed = stressTests.filter((t) => !t.passed);
  const worst =
    failed.sort(
      (a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[a.riskLevel] - ({ HIGH: 0, MEDIUM: 1, LOW: 2 })[b.riskLevel],
    )[0] ?? null;

  const tierCounts = new Map<number, number>();
  for (const e of evidence) tierCounts.set(e.tier, (tierCounts.get(e.tier) ?? 0) + 1);
  const hasTier0 = (tierCounts.get(0) ?? 0) > 0;
  const weakestEvidence = [...evidence].sort((a, b) => a.credibilityScore - b.credibilityScore)[0];

  const q = (
    questionNumber: number,
    question: string,
    answer: string,
    confidence: ConfidenceLevel,
    evidenceIds: string[] = [],
  ): CeoQuestionAnswer => ({
    questionNumber,
    question,
    answer,
    confidence,
    autoPopulated: true,
    evidenceIds,
  });

  return [
    q(
      1,
      'What actually drives the economics of this business?',
      `${geometry} geometry: revenue variance concentrates in ${DRIVER_LABEL[dominant.name] ?? dominant.name} (S_${dominant.name} = ${dominant.firstOrder.toFixed(2)}, 95% CI [${dominant.firstOrderCI[0].toFixed(2)}, ${dominant.firstOrderCI[1].toFixed(2)}]).`,
      hasTier0 ? 'CERTAIN' : 'PROBABLE',
      evidence.filter((e) => e.tier <= 1).map((e) => e.id),
    ),
    q(
      2,
      'Where should the next dollar go?',
      seatDominant
        ? `Ad spend / seat acquisition. With S_N = ${sobol.sN.toFixed(2)} > 0.85, paid acquisition has ~${(sobol.sN / Math.max(sobol.sA, 0.001)).toFixed(1)}× the leverage of pricing optimization.`
        : `Pricing and retention work. S_N = ${sobol.sN.toFixed(2)} is below the 0.85 seat-leverage threshold, so ARPU/churn improvements dominate.`,
      'PROBABLE',
    ),
    q(
      3,
      'What should we STOP doing?',
      seatDominant
        ? "Stop the builder's organic-only strategy. The variance math says distribution, not product polish, moves revenue."
        : 'Stop undifferentiated channel spending until a dominant driver emerges from the data.',
      'SPECULATIVE',
    ),
    q(
      4,
      'Where are we most vulnerable?',
      worst
        ? `${worst.name} (stress test #${worst.testNumber}, ${worst.riskLevel} risk): ${worst.systemResponse}`
        : 'No critical vulnerability detected across the 10 stress tests.',
      worst ? 'PROBABLE' : 'SPECULATIVE',
    ),
    q(
      5,
      'Are we ready to operate this business?',
      `Team readiness scores ${company.teamReadinessScore}/100 (P(ready) = ${pTeamReady.toFixed(2)}). ${pTeamReady >= 0.7 ? 'Sufficient to execute the playbook.' : pTeamReady >= 0.4 ? 'Workable, but plan key hires in the first 90 days.' : 'Not ready — capability building is a precondition to acquisition.'}`,
      'SPECULATIVE',
    ),
    q(
      6,
      'What is blocking us?',
      hasTier0
        ? weakestEvidence
          ? `Weakest link in the evidence chain: "${weakestEvidence.title}" (Tier ${weakestEvidence.tier}, credibility ${(weakestEvidence.credibilityScore * 100).toFixed(0)}%).`
          : 'No blocking evidence gap — direct evidence is on file.'
        : 'No Tier-0 direct observation (Stripe / BIR OR) — every downstream number inherits that uncertainty.',
      hasTier0 ? 'PROBABLE' : 'SPECULATIVE',
      weakestEvidence ? [weakestEvidence.id] : [],
    ),
    q(
      7,
      'Which processes should AI attack first?',
      'VSL / sales-copy generation. Mined pain points (Reddit, G2) convert directly into video-sales-letter scripts — the paper treats success stories as finished VSL scripts.',
      'SPECULATIVE',
    ),
    q(
      8,
      'Automate or augment?',
      (company.employeeCount ?? 0) <= 5
        ? 'Augment. With a micro team, AI should multiply the founder/operators rather than replace judgment calls.'
        : 'Automate tier-1 support and reporting first; augment growth and pricing decisions.',
      'SPECULATIVE',
    ),
    q(
      9,
      'How much is it worth?',
      `Fermi mid estimate: ${usd(fermi.acquisitionPriceMidCents)} acquisition price (band ${usd(fermi.acquisitionPriceLowCents)}–${usd(fermi.acquisitionPriceHighCents)}), median payback ${fermi.paybackMonthsMid.toFixed(0)} months, P(payback < 36 mo) = ${(fermi.pPaybackUnder36Months * 100).toFixed(0)}%.`,
      fermi.constraintWarnings.length === 0 ? 'PROBABLE' : 'SPECULATIVE',
    ),
    q(
      10,
      'What should we do in the next 90 days?',
      decision === 'ACQUIRE'
        ? 'Close and integrate: day 1–30 Stripe/BIR verification + analytics baseline, day 31–60 scale ad spend toward the ROAS optimum, day 61–90 first pricing test and churn cohort review.'
        : decision === 'PILOT'
          ? 'Run the information pilot: $5K/mo Meta ads with a holdout market, weekly elasticity readouts, go/no-go at day 90 against α > 2 and φ < 0.30.'
          : 'Defer gracefully: collect Tier-0 evidence (Stripe access, BIR ORs), re-run this analysis quarterly, and set alerts for elasticity/proof thresholds.',
      'PROBABLE',
    ),
    q(
      11,
      'What should we believe?',
      `Evidence base: ${evidence.length} items — Tier 0: ${tierCounts.get(0) ?? 0}, Tier 1: ${tierCounts.get(1) ?? 0}, Tier 2: ${tierCounts.get(2) ?? 0}, Tier 7: ${tierCounts.get(7) ?? 0}. ${hasTier0 ? 'Direct observation anchors the model.' : 'Everything rests on secondary/synthetic sources — believe the model outputs only as far as Tier ≤ 2 allows.'}`,
      hasTier0 ? 'PROBABLE' : 'CONJECTURE',
      evidence.filter((e) => e.tier === 0).map((e) => e.id),
    ),
    q(
      12,
      'What would change our mind?',
      `The decision flips if: S_N falls below 0.85 (currently ${sobol.sN.toFixed(2)}), pilot elasticity lands under 2, fragility φ rises above 0.30 (currently ${phi.toFixed(2)}), or the Fermi median payback exceeds 36 months (currently ${fermi.paybackMonthsMid.toFixed(0)}).`,
      'PROBABLE',
    ),
  ];
}

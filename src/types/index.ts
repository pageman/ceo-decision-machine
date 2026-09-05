// Domain types for the CEO Decision Machine.
// This file is the fixed contract between the math engine (src/math),
// the store (src/store) and the UI (src/components, src/pages).
// Do not change without updating all three consumers.

export type RevenueModelType = 'seat_ladder' | 'volume_attach' | 'usage_based' | 'hybrid';

export type GeometryFamily = 'SEAT_LADDER' | 'VOLUME_ATTACH' | 'USAGE_BASED' | 'HYBRID';

export type RungLevel = 'RUNG_1' | 'RUNG_2';

export type Decision = 'ACQUIRE' | 'PILOT' | 'DEFER';

export type ConfidenceLevel = 'CERTAIN' | 'PROBABLE' | 'SPECULATIVE' | 'CONJECTURE';

export type EvidenceTier = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type EvidenceSourceType =
  | 'stripe_direct'
  | 'bir_or'
  | 'trustmrr_scrape'
  | 'linkedin'
  | 'g2_reviews'
  | 'subreddit'
  | 'synthetic'
  | 'experimental'
  | 'pilot';

export type TargetAudience = 'global' | 'us' | 'ph';

export interface PricingTier {
  name: string;
  priceCents: number;
  seatsIncluded?: number;
}

export interface Company {
  id: string;
  name: string;
  domain?: string;
  industryVertical: string;
  countryCode: string; // ISO 3166-1 alpha-2, e.g. 'PH', 'US'
  revenueModelType?: RevenueModelType; // user override; auto-classified when absent
  mrrCents: number;
  arpuCents: number;
  seatCount: number;
  churnRate: number; // monthly logo churn, 0..1
  pricingTiers: PricingTier[];
  employeeCount?: number;
  transactionVolume?: number; // monthly transactions (volume-attach signal)
  usageMetricsDescription?: string; // free-text usage signal (usage-based signal)
  adSpendBudgetCents?: number; // monthly ad budget under consideration
  targetAudience: TargetAudience;
  teamReadinessScore: number; // 0..100
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
}

export interface EvidenceItem {
  id: string;
  companyId: string;
  tier: EvidenceTier;
  sourceType: EvidenceSourceType;
  title: string;
  notes?: string;
  // Reserved numeric fields the math engine reads:
  //   dataPayload.alphaPilot?: number       — measured ad elasticity from a pilot
  //   dataPayload.reportedMrrCents?: number — MRR seen by a Tier-0/1 source (fraud cross-check)
  dataPayload: Record<string, unknown>;
  credibilityScore: number; // 0..1, computed by src/math/evidence.ts
  collectedAt: string; // ISO date
  verified: boolean;
}

export interface SobolIndexEstimate {
  name: string; // 'N' | 'A' | 'C'
  firstOrder: number;
  totalOrder: number;
  firstOrderCI: [number, number];
}

export interface SobolResult {
  geometry: GeometryFamily;
  indices: SobolIndexEstimate[];
  sN: number;
  sA: number;
  sC: number;
  sNConfidenceInterval: [number, number];
  interactionDetected: boolean; // true when any S_Ti - S_i > 0.1
  sampleSize: number; // base sample size N of the Saltelli scheme
  modelVersion: string;
}

export interface LeverageResult {
  alpha: number; // seat acquisition multiplier used for the point estimate
  expectedImpactLowCents: number; // uses sN CI lower bound
  expectedImpactMidCents: number;
  expectedImpactHighCents: number; // uses sN CI upper bound
  newMrrMidCents: number;
  leverageRatio: number; // sN / max(sA, 0.001)
  seatLadderDominant: boolean; // sN > 0.85
  // Grid for the sensitivity surface: alpha rows x sN columns -> impact.
  surface: { alpha: number; sN: number; impactCents: number }[];
}

export interface RoasScenario {
  roasTarget: number;
  spendCapCents: number;
  revenueCents: number;
  profitCents: number;
  rankSurgeZone: boolean; // r ~= 2 (the paper's "Rank Surge" operating point)
}

export interface RoasResult {
  alpha0: number;
  beta: number; // diminishing-returns exponent, in [0.1, 0.5]
  optimalRoas: number; // r*
  optimalSpendCents: number; // s*
  maxProfitCents: number;
  scenarios: RoasScenario[]; // r from 1.0 to 5.0
  note?: string; // e.g. boundary optimum explanation
}

export interface FermiParameters {
  mrrLowCents: number;
  mrrMidCents: number;
  mrrHighCents: number;
  multipleLow: number; // ARR multiple
  multipleMid: number;
  multipleHigh: number;
  adSpendLowCents: number; // monthly
  adSpendMidCents: number;
  adSpendHighCents: number;
  targetMrrGrowthLow: number; // multiplier on current MRR achievable in year 1
  targetMrrGrowthMid: number;
  targetMrrGrowthHigh: number;
  netMarginLow: number; // 0..1
  netMarginMid: number;
  netMarginHigh: number;
}

export interface FermiResult {
  params: FermiParameters;
  acquisitionPriceLowCents: number; // MRR x 12 x multiple, per bound
  acquisitionPriceMidCents: number;
  acquisitionPriceHighCents: number;
  paybackMonthsLow: number;
  paybackMonthsMid: number;
  paybackMonthsHigh: number;
  pPaybackUnder36Months: number; // Monte Carlo posterior
  npvPercentiles: { p5: number; p50: number; p95: number }; // cents, 36-month horizon
  paybackHistogram: { binStartMonths: number; binEndMonths: number; count: number }[];
  mrrEstimates: {
    directCents: number;
    computedCents: number; // N x A x (1 - c)
    inferredCents: number | null; // employeeCount-based, null without employeeCount
    spreadPct: number; // (max - min) / mid across available estimates
  };
  constraintWarnings: string[];
  iterations: number;
}

export type StressTestCategory = 'elasticity' | 'platform' | 'target' | 'market' | 'validation';
export type StressRiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface StressTestResult {
  testNumber: number; // 1..10 (paper Table 5)
  name: string;
  category: StressTestCategory;
  failureMode: string;
  systemResponse: string;
  riskLevel: StressRiskLevel;
  passed: boolean;
  mitigation: string;
}

export interface CeoQuestionAnswer {
  questionNumber: number; // 1..12
  question: string;
  answer: string;
  confidence: ConfidenceLevel;
  autoPopulated: boolean;
  evidenceIds: string[];
}

export interface Recommendation {
  pAdsScale: number;
  pSnDominant: number;
  pValuationAttractive: number;
  pTeamReady: number;
  pAcquire: number; // joint posterior (product of factors)
  fragilityPhi: number; // 0..1
  decision: Decision;
  voiMaxCents: number;
  nextBestEvidence: string;
  confidenceLevel: ConfidenceLevel;
  explanation: string; // natural-language decision rationale
  causalBoundaryAcknowledged: boolean;
}

export interface CausalChecklist {
  controlledHoldout: boolean;
  steppedWedge: boolean;
  diffInDiff: boolean;
  instrumentalVariable: boolean;
}

export interface MrrSanityCheck {
  computedMrrCents: number;
  reportedMrrCents: number;
  deviationPct: number; // |computed - reported| / reported
  withinTolerance: boolean; // deviation <= 5%
}

export interface AnalysisResult {
  id: string;
  companyId: string;
  createdAt: string;
  geometry: GeometryFamily;
  geometryConfidence: number; // prior/posterior probability of the classification
  mrrSanityCheck: MrrSanityCheck;
  sobol: SobolResult;
  leverage: LeverageResult;
  roas: RoasResult;
  fermi: FermiResult;
  stressTests: StressTestResult[];
  ceoAnswers: CeoQuestionAnswer[];
  recommendation: Recommendation;
  rungLevel: RungLevel; // RUNG_2 when causal validation evidence exists
  causalChecklist: CausalChecklist;
}

export interface AppSettings {
  epsilonVoiCents: number; // VOI threshold epsilon, default $50,000
  displayCurrency: 'USD' | 'PHP';
  phpPerUsd: number; // static exchange rate, user-editable
  expertMode: boolean;
  defaultAlpha: number; // default seat acquisition multiplier for Prop 1
}

/**
 * Full analysis pipeline (paper Phase 4.1 DAG, executed synchronously client-side):
 * ingest → classify → validate → sobol → leverage → roas → fermi → posterior →
 * fragility → voi/decision → stress tests → 12 CEO questions.
 */
import type {
  AnalysisResult,
  AppSettings,
  Company,
  EvidenceItem,
  RungLevel,
} from '../types';
import { classifyGeometry, validateSeatLadder } from './geometry';
import { computeSobol } from './sobol';
import { computeLeverage } from './leverage';
import { computeRoas } from './roas';
import { computeFermi, defaultFermiParams } from './fermi';
import { computePosterior } from './posterior';
import { computeFragility } from './fragility';
import { computeVoi, decide, explainDecision, confidenceFromPhi } from './decision';
import { runStressTests } from './stressTests';
import { buildCeoAnswers } from './questions';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function runFullAnalysis(
  company: Company,
  evidence: EvidenceItem[],
  settings: AppSettings,
): AnalysisResult {
  const { geometry, confidence: geometryConfidence } = classifyGeometry(company);
  const mrrSanityCheck = validateSeatLadder(company);

  const sobol = computeSobol(company, geometry);
  const leverage = computeLeverage(company.mrrCents, sobol, settings.defaultAlpha);
  const roas = computeRoas();
  const fermi = computeFermi(company, defaultFermiParams(company));

  const posterior = computePosterior(company, sobol, fermi, evidence);
  const phi = computeFragility(sobol, fermi, posterior.pTeamReady, posterior.alphaPilot);
  const { voiMaxCents, nextBestEvidence } = computeVoi(posterior, fermi);
  const decision = decide(
    sobol.sN,
    posterior.alphaPilot,
    phi,
    voiMaxCents,
    settings.epsilonVoiCents,
  );

  const rungLevel: RungLevel =
    posterior.alphaPilot !== null ||
    evidence.some((e) => e.sourceType === 'pilot' || e.sourceType === 'experimental')
      ? 'RUNG_2'
      : 'RUNG_1';

  const stressTests = runStressTests({
    company,
    sobol,
    fermi,
    alphaPilot: posterior.alphaPilot,
    evidence,
  });

  const ceoAnswers = buildCeoAnswers({
    company,
    geometry,
    sobol,
    fermi,
    stressTests,
    decision,
    phi,
    evidence,
    pTeamReady: posterior.pTeamReady,
  });

  const explanation = explainDecision({
    decision,
    sN: sobol.sN,
    alphaPilot: posterior.alphaPilot,
    phi,
    voiMaxCents,
    epsilonCents: settings.epsilonVoiCents,
    geometry,
  });

  return {
    id: uid(),
    companyId: company.id,
    createdAt: new Date().toISOString(),
    geometry,
    geometryConfidence,
    mrrSanityCheck,
    sobol,
    leverage,
    roas,
    fermi,
    stressTests,
    ceoAnswers,
    recommendation: {
      pAdsScale: posterior.pAdsScale,
      pSnDominant: posterior.pSnDominant,
      pValuationAttractive: posterior.pValuationAttractive,
      pTeamReady: posterior.pTeamReady,
      pAcquire: posterior.pAcquire,
      fragilityPhi: phi,
      decision,
      voiMaxCents,
      nextBestEvidence,
      confidenceLevel: confidenceFromPhi(phi, rungLevel),
      explanation,
      causalBoundaryAcknowledged: false,
    },
    rungLevel,
    causalChecklist: {
      controlledHoldout: false,
      steppedWedge: false,
      diffInDiff: false,
      instrumentalVariable: false,
    },
  };
}

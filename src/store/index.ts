import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnalysisResult,
  AppSettings,
  CausalChecklist,
  CeoQuestionAnswer,
  Company,
  EvidenceItem,
} from '../types';
import { runFullAnalysis } from '../math/pipeline';
import { computeCredibilityScore } from '../math/evidence';

export type NewCompanyInput = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>;
export type NewEvidenceInput = Omit<EvidenceItem, 'id' | 'collectedAt' | 'credibilityScore'>;

export const DEFAULT_SETTINGS: AppSettings = {
  epsilonVoiCents: 5_000_000, // $50,000
  displayCurrency: 'USD',
  phpPerUsd: 56,
  expertMode: false,
  defaultAlpha: 1.5,
};

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function latestAnalysisFor(
  analyses: AnalysisResult[],
  companyId: string,
): AnalysisResult | undefined {
  const matches = analyses.filter((a) => a.companyId === companyId);
  return matches.length > 0 ? matches[matches.length - 1] : undefined;
}

interface AppState {
  companies: Company[];
  analyses: AnalysisResult[];
  evidence: EvidenceItem[];
  settings: AppSettings;

  addCompany: (input: NewCompanyInput) => Company;
  updateCompany: (id: string, patch: Partial<NewCompanyInput>) => void;
  deleteCompany: (id: string) => void;

  addEvidence: (input: NewEvidenceInput) => EvidenceItem;
  deleteEvidence: (id: string) => void;
  verifyEvidence: (id: string) => void;

  runAnalysis: (companyId: string) => AnalysisResult | null;
  updateCeoAnswer: (
    companyId: string,
    questionNumber: number,
    patch: Partial<CeoQuestionAnswer>,
  ) => void;
  updateCausalChecklist: (companyId: string, patch: Partial<CausalChecklist>) => void;
  acknowledgeCausalBoundary: (companyId: string) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  clearAllData: () => void;
}

function patchLatestAnalysis(
  analyses: AnalysisResult[],
  companyId: string,
  patcher: (a: AnalysisResult) => AnalysisResult,
): AnalysisResult[] {
  const idx = [...analyses]
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => a.companyId === companyId)
    .map(({ i }) => i)
    .pop();
  if (idx === undefined) return analyses;
  const next = [...analyses];
  next[idx] = patcher(next[idx]);
  return next;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      companies: [],
      analyses: [],
      evidence: [],
      settings: DEFAULT_SETTINGS,

      addCompany: (input) => {
        const now = new Date().toISOString();
        const company: Company = { ...input, id: uid(), createdAt: now, updatedAt: now };
        set((s) => ({ companies: [...s.companies, company] }));
        return company;
      },

      updateCompany: (id, patch) =>
        set((s) => ({
          companies: s.companies.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
          ),
        })),

      deleteCompany: (id) =>
        set((s) => ({
          companies: s.companies.filter((c) => c.id !== id),
          analyses: s.analyses.filter((a) => a.companyId !== id),
          evidence: s.evidence.filter((e) => e.companyId !== id),
        })),

      addEvidence: (input) => {
        const item: EvidenceItem = {
          ...input,
          id: uid(),
          collectedAt: new Date().toISOString(),
          credibilityScore: 0,
        };
        const companyEvidence = get().evidence.filter((e) => e.companyId === item.companyId);
        item.credibilityScore = computeCredibilityScore(item, [...companyEvidence, item]);
        set((s) => ({ evidence: [...s.evidence, item] }));
        return item;
      },

      deleteEvidence: (id) => set((s) => ({ evidence: s.evidence.filter((e) => e.id !== id) })),

      verifyEvidence: (id) =>
        set((s) => ({
          evidence: s.evidence.map((e) => {
            if (e.id !== id) return e;
            const verified = { ...e, verified: true };
            return {
              ...verified,
              credibilityScore: computeCredibilityScore(
                verified,
                s.evidence.filter((x) => x.companyId === e.companyId),
              ),
            };
          }),
        })),

      runAnalysis: (companyId) => {
        const state = get();
        const company = state.companies.find((c) => c.id === companyId);
        if (!company) return null;
        const companyEvidence = state.evidence.filter((e) => e.companyId === companyId);
        const result = runFullAnalysis(company, companyEvidence, state.settings);
        set((s) => ({ analyses: [...s.analyses, result] }));
        return result;
      },

      updateCeoAnswer: (companyId, questionNumber, patch) =>
        set((s) => ({
          analyses: patchLatestAnalysis(s.analyses, companyId, (a) => ({
            ...a,
            ceoAnswers: a.ceoAnswers.map((q) =>
              q.questionNumber === questionNumber ? { ...q, ...patch, autoPopulated: false } : q,
            ),
          })),
        })),

      updateCausalChecklist: (companyId, patch) =>
        set((s) => ({
          analyses: patchLatestAnalysis(s.analyses, companyId, (a) => ({
            ...a,
            causalChecklist: { ...a.causalChecklist, ...patch },
          })),
        })),

      acknowledgeCausalBoundary: (companyId) =>
        set((s) => ({
          analyses: patchLatestAnalysis(s.analyses, companyId, (a) => ({
            ...a,
            recommendation: { ...a.recommendation, causalBoundaryAcknowledged: true },
          })),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      clearAllData: () => set({ companies: [], analyses: [], evidence: [] }),
    }),
    { name: 'cdm-store', version: 1 },
  ),
);

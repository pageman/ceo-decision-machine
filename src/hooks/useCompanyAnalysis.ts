import { useParams } from 'react-router-dom';
import { latestAnalysisFor, useAppStore } from '../store';
import type { AnalysisResult, Company } from '../types';

/** Resolves the `:id` route param to a company and its latest analysis. */
export function useCompanyAnalysis(): {
  id: string;
  company: Company | undefined;
  analysis: AnalysisResult | undefined;
} {
  const { id = '' } = useParams();
  const company = useAppStore((s) => s.companies.find((c) => c.id === id));
  const analysis = useAppStore((s) => (id ? latestAnalysisFor(s.analyses, id) : undefined));
  return { id, company, analysis };
}

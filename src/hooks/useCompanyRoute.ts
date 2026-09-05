import { useParams } from 'react-router-dom';
import { latestAnalysisFor, useAppStore } from '../store';
import type { AnalysisResult, Company } from '../types';

export interface CompanyRoute {
  id: string | undefined;
  company: Company | undefined;
  analysis: AnalysisResult | undefined;
}

/**
 * Shared resolver for all `/.../:id` routes: looks up the company and its
 * latest analysis from the store.
 */
export function useCompanyRoute(): CompanyRoute {
  const { id } = useParams<{ id: string }>();
  const company = useAppStore((s) => s.companies.find((c) => c.id === id));
  const analysis = useAppStore((s) => (id ? latestAnalysisFor(s.analyses, id) : undefined));
  return { id, company, analysis };
}

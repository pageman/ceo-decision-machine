import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { computeLeverage } from '../math/leverage';
import { useCompanyAnalysis } from '../hooks/useCompanyAnalysis';
import { useAppStore } from '../store';
import { Money } from '../components/Money';
import { CountUpNumber, EmptyState } from '../components/ui';
import { SliderField } from '../components/SliderField';
import { OrderComparisonBars, SobolBarChart, SurfaceHeatmap, VarianceDonut } from '../components/charts';
import { formatCents } from '../components/Money';

export function SobolView() {
  const { id, company, analysis } = useCompanyAnalysis();
  const acknowledge = useAppStore((s) => s.acknowledgeCausalBoundary);
  const settings = useAppStore((s) => s.settings);
  const [alpha, setAlpha] = useState<number | null>(null);

  const effectiveAlpha = alpha ?? analysis?.leverage.alpha ?? 1.5;
  const leverage = useMemo(() => {
    if (!company || !analysis) return null;
    if (alpha === null) return analysis.leverage;
    return computeLeverage(company.mrrCents, analysis.sobol, alpha);
  }, [company, analysis, alpha]);

  if (!company) return <Navigate to="/companies" replace />;
  if (!analysis || !leverage) {
    return (
      <EmptyState
        icon="∂"
        title="No Sobol analysis yet"
        message="Run the analysis first to decompose revenue variance."
      />
    );
  }

  const { sobol } = analysis;
  const acknowledged = analysis.recommendation.causalBoundaryAcknowledged;

  return (
    <div>
      <h1 className="mb-1">Sobol Analysis — {company.name}</h1>
      <p className="muted mb-2">
        Saltelli sampling, {sobol.sampleSize.toLocaleString()} base samples · model{' '}
        {sobol.modelVersion}
      </p>

      {sobol.sN > 0.85 ? (
        <div className="callout callout-accent">
          <div className="callout-title">SEAT-LADDER DOMINANT</div>
          S_N = {sobol.sN.toFixed(2)} &gt; 0.85 — seat acquisition is the revenue lever (TrustMRR
          thesis mode enabled).
        </div>
      ) : null}

      {sobol.interactionDetected ? (
        <div className="callout">
          <div className="callout-title">High parameter interaction</div>
          S_Ti − S_i &gt; 0.1 for at least one parameter — copula modeling is recommended over the
          independence assumption.
        </div>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">First-order indices (with 95% CI)</h2>
          <SobolBarChart sobol={sobol} />
        </div>
        <div className="card">
          <h2 className="card-title">Variance decomposition</h2>
          <VarianceDonut sobol={sobol} />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">First-order vs total-order (interaction check)</h2>
        <OrderComparisonBars sobol={sobol} />
      </div>

      <div className={acknowledged ? '' : ''}>
        {!acknowledged ? (
          <div className="callout">
            <div className="callout-title">Causal boundary (Proposition 2)</div>
            <p>
              S_i predicts <em>where</em> variance concentrates; it does not prove that ads{' '}
              <em>cause</em> revenue growth. The leverage below is a Rung-1 observational
              projection until validated by a holdout or pilot (Rung 2).
            </p>
            <button type="button" className="btn btn-primary" onClick={() => acknowledge(id)}>
              I understand — show the leverage calculator
            </button>
          </div>
        ) : (
          <>
            <div className="card">
              <h2 className="card-title">Acquisition leverage (Proposition 1)</h2>
              <SliderField
                id="lv-alpha"
                label="α — seat acquisition multiplier"
                min={1}
                max={50}
                step={0.5}
                value={effectiveAlpha}
                onChange={setAlpha}
                format={(v) => `${v.toFixed(1)}×`}
              />
              <div className="grid grid-3">
                <div className="stat">
                  <div className="stat-label">Expected impact — low (CI lower)</div>
                  <div className="stat-value" style={{ color: 'var(--amber)' }}>
                    <CountUpNumber text={formatCents(leverage.expectedImpactLowCents, settings)} />
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Expected impact — mid</div>
                  <div className="stat-value" style={{ color: 'var(--green)' }}>
                    <CountUpNumber text={formatCents(leverage.expectedImpactMidCents, settings)} />
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">Expected impact — high (CI upper)</div>
                  <div className="stat-value" style={{ color: 'var(--accent)' }}>
                    <CountUpNumber text={formatCents(leverage.expectedImpactHighCents, settings)} />
                  </div>
                </div>
              </div>
              <p className="mt-2 muted">
                E[ΔY] ≥ S_N·(α−1)·Y → new MRR ≈ <Money cents={leverage.newMrrMidCents} /> · leverage
                ratio S_N/S_A = {leverage.leverageRatio.toFixed(1)}× (paid traffic vs pricing
                optimization)
              </p>
            </div>

            <div className="card">
              <h2 className="card-title">Sensitivity surface — E[ΔY] over α × S_N</h2>
              <SurfaceHeatmap surface={leverage.surface} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

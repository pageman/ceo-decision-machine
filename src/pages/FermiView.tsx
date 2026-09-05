import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { computeFermi } from '../math/fermi';
import { useCompanyAnalysis } from '../hooks/useCompanyAnalysis';
import { useAppStore } from '../store';
import { Money, formatCents } from '../components/Money';
import { EmptyState, Stat } from '../components/ui';
import { SliderField } from '../components/SliderField';
import { Gauge } from '../components/Gauge';
import { PaybackHistogram } from '../components/charts';
import type { FermiParameters } from '../types';

export function FermiView() {
  const { company, analysis } = useCompanyAnalysis();
  const settings = useAppStore((s) => s.settings);
  const [params, setParams] = useState<FermiParameters | null>(null);
  const [result, setResult] = useState(analysis?.fermi ?? null);
  const [running, setRunning] = useState(false);

  if (!company) return <Navigate to="/companies" replace />;
  if (!analysis || !result) {
    return (
      <EmptyState
        icon="≈"
        title="No Fermi valuation yet"
        message="Run the analysis first to generate the Monte Carlo valuation."
      />
    );
  }

  const p = params ?? analysis.fermi.params;
  const set = <K extends keyof FermiParameters>(key: K, value: FermiParameters[K]) =>
    setParams({ ...p, [key]: value });

  const fmt = (cents: number) => formatCents(cents, settings);
  const mrrMax = Math.max(p.mrrHighCents * 1.5, p.mrrMidCents * 2, 500_000);
  const adMax = Math.max(p.adSpendHighCents * 2, p.adSpendMidCents * 3, 500_000);

  const moneyTriple = (
    label: string,
    lowKey: 'mrrLowCents' | 'adSpendLowCents',
    midKey: 'mrrMidCents' | 'adSpendMidCents',
    highKey: 'mrrHighCents' | 'adSpendHighCents',
    max: number,
  ) => (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{label}</h3>
      <SliderField id={`${lowKey}`} label="Low" min={0} max={max} step={5000} value={p[lowKey]} onChange={(v) => set(lowKey, v)} format={fmt} />
      <SliderField id={`${midKey}`} label="Mid" min={0} max={max} step={5000} value={p[midKey]} onChange={(v) => set(midKey, v)} format={fmt} />
      <SliderField id={`${highKey}`} label="High" min={0} max={max} step={5000} value={p[highKey]} onChange={(v) => set(highKey, v)} format={fmt} />
    </div>
  );

  const numTriple = (
    label: string,
    lowKey: 'multipleLow' | 'targetMrrGrowthLow' | 'netMarginLow',
    midKey: 'multipleMid' | 'targetMrrGrowthMid' | 'netMarginMid',
    highKey: 'multipleHigh' | 'targetMrrGrowthHigh' | 'netMarginHigh',
    min: number,
    max: number,
    step: number,
    unit: string,
  ) => (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <h3 style={{ marginBottom: '0.5rem' }}>{label}</h3>
      <SliderField id={`${lowKey}`} label="Low" min={min} max={max} step={step} value={p[lowKey]} onChange={(v) => set(lowKey, v)} format={(v) => `${v.toFixed(step < 1 ? 2 : 0)}${unit}`} />
      <SliderField id={`${midKey}`} label="Mid" min={min} max={max} step={step} value={p[midKey]} onChange={(v) => set(midKey, v)} format={(v) => `${v.toFixed(step < 1 ? 2 : 0)}${unit}`} />
      <SliderField id={`${highKey}`} label="High" min={min} max={max} step={step} value={p[highKey]} onChange={(v) => set(highKey, v)} format={(v) => `${v.toFixed(step < 1 ? 2 : 0)}${unit}`} />
    </div>
  );

  return (
    <div>
      <h1 className="mb-1">Fermi Valuation — {company.name}</h1>
      <p className="muted mb-2">{result.iterations.toLocaleString()} Monte Carlo runs · 36-month horizon · 10%/yr discount</p>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div>
          {moneyTriple('MRR', 'mrrLowCents', 'mrrMidCents', 'mrrHighCents', mrrMax)}
          {numTriple('ARR multiple', 'multipleLow', 'multipleMid', 'multipleHigh', 0, 10, 0.1, '×')}
          {moneyTriple('Monthly ad spend', 'adSpendLowCents', 'adSpendMidCents', 'adSpendHighCents', adMax)}
          {numTriple('Target MRR growth (yr 1)', 'targetMrrGrowthLow', 'targetMrrGrowthMid', 'targetMrrGrowthHigh', 0, 5, 0.1, '×')}
          {numTriple('Net margin', 'netMarginLow', 'netMarginMid', 'netMarginHigh', 0, 1, 0.01, '')}
          <button
            type="button"
            className="btn btn-primary"
            disabled={running}
            onClick={() => {
              setRunning(true);
              // Defer to keep the UI responsive on slower devices.
              setTimeout(() => {
                setResult(computeFermi(company, p));
                setRunning(false);
              }, 30);
            }}
          >
            {running ? 'Running…' : 'Run Monte Carlo'}
          </button>
        </div>

        <div>
          <div className="grid grid-3">
            <Stat label="Price — low" value={<Money cents={result.acquisitionPriceLowCents} />} />
            <Stat label="Price — mid" value={<Money cents={result.acquisitionPriceMidCents} />} />
            <Stat label="Price — high" value={<Money cents={result.acquisitionPriceHighCents} />} />
          </div>

          <div className="card">
            <h2 className="card-title">Payback period (median)</h2>
            <Gauge
              value={result.paybackMonthsMid}
              max={120}
              zones={[
                { upTo: 24, color: 'var(--green)' },
                { upTo: 36, color: 'var(--amber)' },
                { upTo: 120, color: 'var(--red)' },
              ]}
              label="Payback months"
              displayValue={`${result.paybackMonthsMid.toFixed(0)} mo`}
            />
            <p className="muted" style={{ textAlign: 'center', marginBottom: 0 }}>
              band {result.paybackMonthsLow.toFixed(0)}–{result.paybackMonthsHigh.toFixed(0)} mo ·
              P(&lt;36 mo) = {(result.pPaybackUnder36Months * 100).toFixed(1)}%
            </p>
          </div>

          <div className="card">
            <h2 className="card-title">Payback distribution</h2>
            <PaybackHistogram bins={result.paybackHistogram} />
          </div>

          <div className="grid grid-3">
            <Stat label="NPV p5" value={<Money cents={result.npvPercentiles.p5} />} />
            <Stat label="NPV p50" value={<Money cents={result.npvPercentiles.p50} />} />
            <Stat label="NPV p95" value={<Money cents={result.npvPercentiles.p95} />} />
          </div>

          <div className="card">
            <h2 className="card-title">MRR triangulation</h2>
            <p style={{ marginBottom: '0.25rem' }}>
              Direct: <Money cents={result.mrrEstimates.directCents} /> · Computed (N×A×(1−c)):{' '}
              <Money cents={result.mrrEstimates.computedCents} />
              {result.mrrEstimates.inferredCents !== null ? (
                <>
                  {' '}
                  · Inferred (employees): <Money cents={result.mrrEstimates.inferredCents} />
                </>
              ) : null}
            </p>
            <p className="muted" style={{ marginBottom: 0 }}>
              Spread {(result.mrrEstimates.spreadPct * 100).toFixed(0)}%
              {result.mrrEstimates.spreadPct > 0.3 ? ' — wide feasible region' : ''}
            </p>
          </div>

          {result.constraintWarnings.length > 0 ? (
            <div className="callout">
              <div className="callout-title">Constraint warnings</div>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {result.constraintWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

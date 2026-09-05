import { Navigate } from 'react-router-dom';
import { useCompanyAnalysis } from '../hooks/useCompanyAnalysis';
import { Money } from '../components/Money';
import { ConfidenceChip, DecisionBadge, EmptyState, ProbabilityBar } from '../components/ui';
import { Gauge } from '../components/Gauge';

export function RecommendationView() {
  const { company, analysis } = useCompanyAnalysis();

  if (!company) return <Navigate to="/companies" replace />;
  if (!analysis) {
    return (
      <EmptyState
        icon="⚖"
        title="No recommendation yet"
        message="Run the analysis first to compute the acquisition posterior."
      />
    );
  }

  const rec = analysis.recommendation;
  const checklistDone = Object.values(analysis.causalChecklist).filter(Boolean).length;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cdm-analysis-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="mb-2">Recommendation — {company.name}</h1>

      <div className="card" style={{ textAlign: 'center' }}>
        <div className="card-title">Final decision</div>
        <DecisionBadge decision={rec.decision} large />
        <p className="mt-2 mb-1">
          <ConfidenceChip level={rec.confidenceLevel} />{' '}
          <span className="chip">{analysis.rungLevel === 'RUNG_2' ? 'Rung 2 — causal' : 'Rung 1 — observational'}</span>
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          P(acquire | E) = <strong className="mono">{(rec.pAcquire * 100).toFixed(1)}%</strong>
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Factor posteriors</h2>
        <ProbabilityBar label="P(ads scale | E)" value={rec.pAdsScale} color="var(--accent)" />
        <ProbabilityBar label="P(S_N > 0.85 | E)" value={rec.pSnDominant} color="var(--accent)" />
        <ProbabilityBar
          label="P(valuation attractive | E)"
          value={rec.pValuationAttractive}
          color="var(--accent)"
        />
        <ProbabilityBar label="P(team ready | E)" value={rec.pTeamReady} color="var(--accent)" />
        <ProbabilityBar label="P(acquire | E) — joint" value={rec.pAcquire} color="var(--green)" />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="card-title">Fragility φ</h2>
          <Gauge
            value={rec.fragilityPhi}
            max={1}
            zones={[
              { upTo: 0.3, color: 'var(--green)' },
              { upTo: 0.6, color: 'var(--amber)' },
              { upTo: 1, color: 'var(--red)' },
            ]}
            label="Fragility"
            displayValue={rec.fragilityPhi.toFixed(2)}
          />
        </div>
        <div className="card">
          <h2 className="card-title">Value of information</h2>
          <div className="stat-value" style={{ fontSize: '1.6rem' }}>
            <Money cents={rec.voiMaxCents} />
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Next best evidence: {rec.nextBestEvidence}
          </p>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Why this decision</h2>
        <p style={{ marginBottom: 0 }}>{rec.explanation}</p>
      </div>

      {checklistDone < 4 ? (
        <div className="callout">
          <div className="callout-title">Causal boundary caveat</div>
          Causal validation is {checklistDone}/4 complete — S_i predicts where variance
          concentrates; it does not prove that ads cause revenue growth. Treat all exports as
          Rung-1 observational.
        </div>
      ) : null}

      <button type="button" className="btn" onClick={exportJson}>
        ⤓ Export JSON
      </button>
    </div>
  );
}

import { Navigate } from 'react-router-dom';
import { useCompanyAnalysis } from '../hooks/useCompanyAnalysis';
import { useAppStore } from '../store';
import { Money } from '../components/Money';
import { EmptyState, Stat } from '../components/ui';

export function PilotTracker() {
  const { company, analysis } = useCompanyAnalysis();
  const settings = useAppStore((s) => s.settings);

  if (!company) return <Navigate to="/companies" replace />;
  if (!analysis) {
    return (
      <EmptyState
        icon="⚗"
        title="No pilot plan yet"
        message="Run the analysis first — the pilot design is derived from the decision and VOI."
      />
    );
  }

  const rec = analysis.recommendation;
  const isElasticityPilot = rec.nextBestEvidence.toLowerCase().includes('elasticity');

  const phases = isElasticityPilot
    ? [
        {
          label: 'Setup',
          bars: [true, false, false],
          items: 'Meta ad account + pixel audit · holdout market selection (geo split) · baseline MRR capture',
        },
        {
          label: 'Measure',
          bars: [false, true, true],
          items: '$5K/mo spend in treatment market only · weekly elasticity readout α = ΔMRR/Δspend · CI tracking',
        },
        {
          label: 'Decide',
          bars: [false, false, true],
          items: 'Day-90 go/no-go against the decision rule · Bayesian posterior update · final recommendation',
        },
      ]
    : [
        {
          label: 'Setup',
          bars: [true, false, false],
          items: 'Instrument retention events · define acquisition-date cohorts · baseline churn curve',
        },
        {
          label: 'Measure',
          bars: [false, true, false],
          items: '30-day retention cohort study · weekly churn-by-cohort readout · qualitative exit interviews',
        },
        {
          label: 'Decide',
          bars: [false, false, true],
          items: 'Project LTV under observed retention · re-run Fermi with measured churn · go/no-go',
        },
      ];

  return (
    <div style={{ maxWidth: 820 }}>
      <h1 className="mb-1">90-Day Pilot — {company.name}</h1>
      <p className="muted mb-2">
        Design: <strong>{isElasticityPilot ? 'Ad elasticity pilot' : 'Retention cohort study'}</strong>{' '}
        (driven by VOI: {rec.nextBestEvidence})
      </p>

      <div className="grid grid-3 mb-2">
        <Stat
          label="Budget"
          value={isElasticityPilot ? <Money cents={500_000} /> : <Money cents={100_000} />}
          sub={isElasticityPilot ? 'per month, Meta ads' : 'tooling + incentives'}
        />
        <Stat label="Duration" value="90 days" sub="3 × 30-day phases" />
        <Stat
          label="Success metric"
          value={isElasticityPilot ? 'α > 2' : 'churn ≤ baseline'}
          sub="with CI width < 20% of mean"
        />
      </div>

      <div className="card">
        <h2 className="card-title">Timeline</h2>
        <div className="gantt">
          <div className="gantt-label" />
          <div className="gantt-label">Days 1–30</div>
          <div className="gantt-label">Days 31–60</div>
          <div className="gantt-label">Days 61–90</div>
          {phases.map((ph) => (
            <>
              <div className="gantt-label" key={`${ph.label}-label`}>
                {ph.label}
              </div>
              {ph.bars.map((active, i) =>
                active ? (
                  <div className="gantt-bar" key={`${ph.label}-${i}`}>
                    {ph.label}
                  </div>
                ) : (
                  <div className="gantt-cell" key={`${ph.label}-${i}`} />
                ),
              )}
            </>
          ))}
        </div>
        {phases.map((ph) => (
          <p key={ph.label} className="mt-1" style={{ marginBottom: '0.25rem' }}>
            <strong>{ph.label}:</strong> <span className="muted">{ph.items}</span>
          </p>
        ))}
      </div>

      <div className="card">
        <h2 className="card-title">Go / No-Go criteria (decision rule)</h2>
        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li>
            S_N &gt; 0.85 — currently <strong className="mono">{analysis.sobol.sN.toFixed(2)}</strong>
          </li>
          <li>
            α_pilot &gt; 2 — currently{' '}
            <strong className="mono">
              {rec.nextBestEvidence && analysis.rungLevel === 'RUNG_2' ? 'measured' : 'not measured'}
            </strong>
          </li>
          <li>
            φ &lt; 0.30 — currently <strong className="mono">{rec.fragilityPhi.toFixed(2)}</strong>
          </li>
          <li>
            VOI_max &lt; ε — currently <Money cents={rec.voiMaxCents} /> vs ε{' '}
            <Money cents={settings.epsilonVoiCents} />
          </li>
        </ul>
        <p className="muted mt-1" style={{ marginBottom: 0 }}>
          All four conditions green at day 90 → ACQUIRE. VOI still ≥ ε → extend the pilot. Otherwise
          → DEFER.
        </p>
      </div>

      <div className="callout callout-accent">
        <div className="callout-title">Weekly discipline</div>
        Log ad spend and Stripe revenue weekly; the elasticity estimator α = ΔMRR/ΔAdSpend only
        converges with consistent cadence. The pilot auto-completes when the CI width falls below
        20% of the mean.
      </div>
    </div>
  );
}

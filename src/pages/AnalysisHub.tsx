import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { useCompanyAnalysis } from '../hooks/useCompanyAnalysis';
import { Money } from '../components/Money';
import {
  ConfidenceChip,
  DecisionBadge,
  EmptyState,
  ProgressBar,
  Stat,
} from '../components/ui';
import type { CeoQuestionAnswer, ConfidenceLevel } from '../types';

const CHECKLIST_ITEMS: { key: keyof import('../types').CausalChecklist; label: string }[] = [
  { key: 'controlledHoldout', label: 'Controlled holdout (Market A with ads, Market B without)' },
  { key: 'steppedWedge', label: 'Stepped-wedge rollout' },
  { key: 'diffInDiff', label: 'Difference-in-differences with matched control' },
  { key: 'instrumentalVariable', label: 'Instrumental variable (ad cost shocks)' },
];

function StressCard({ result }: { result: import('../types').StressTestResult }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`stress-card ${result.passed ? 'pass' : 'fail'}`}
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setOpen((o) => !o);
        }
      }}
    >
      <div className="stress-head">
        <span>
          #{result.testNumber} {result.name}
        </span>
        <span className={`badge ${result.passed ? 'badge-green' : 'badge-red'}`}>
          {result.passed ? 'PASS' : 'FAIL'}
        </span>
      </div>
      <div className="muted" style={{ fontSize: '0.8rem', marginTop: 2 }}>
        {result.category} · {result.riskLevel} risk
      </div>
      {open ? (
        <div className="stress-detail">
          <p>
            <strong>Failure mode:</strong> {result.failureMode}
          </p>
          <p>
            <strong>System response:</strong> {result.systemResponse}
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Mitigation:</strong> {result.mitigation}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function QuestionCard({
  answer,
  onSave,
}: {
  answer: CeoQuestionAnswer;
  onSave: (patch: Partial<CeoQuestionAnswer>) => void;
}) {
  const [text, setText] = useState(answer.answer);
  return (
    <div className="qa-card">
      <div className="qa-head">
        <span className="qa-question">
          Q{answer.questionNumber}. {answer.question}
        </span>
        <span style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
          {answer.autoPopulated ? <span className="chip">auto</span> : null}
          <ConfidenceChip level={answer.confidence} />
        </span>
      </div>
      <div className="field" style={{ marginBottom: '0.5rem' }}>
        <label htmlFor={`qa-${answer.questionNumber}`} className="hint">
          Answer
        </label>
        <textarea
          id={`qa-${answer.questionNumber}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text !== answer.answer) onSave({ answer: text });
          }}
        />
      </div>
      <div className="field" style={{ marginBottom: 0, maxWidth: 260 }}>
        <label htmlFor={`qc-${answer.questionNumber}`} className="hint">
          Confidence
        </label>
        <select
          id={`qc-${answer.questionNumber}`}
          value={answer.confidence}
          onChange={(e) => onSave({ confidence: e.target.value as ConfidenceLevel })}
        >
          {(['CERTAIN', 'PROBABLE', 'SPECULATIVE', 'CONJECTURE'] as const).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function AnalysisHub() {
  const { id, company, analysis } = useCompanyAnalysis();
  const runAnalysis = useAppStore((s) => s.runAnalysis);
  const updateCeoAnswer = useAppStore((s) => s.updateCeoAnswer);
  const updateCausalChecklist = useAppStore((s) => s.updateCausalChecklist);
  const navigate = useNavigate();

  if (!company) return <Navigate to="/companies" replace />;

  if (!analysis) {
    return (
      <EmptyState
        icon="◔"
        title={`No analysis for ${company.name} yet`}
        message="Run the full pipeline: geometry classification, Sobol decomposition, Fermi valuation, stress tests and the final recommendation."
        action={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const r = runAnalysis(id);
              if (r) navigate(0);
            }}
          >
            Run Analysis
          </button>
        }
      />
    );
  }

  const sanity = analysis.mrrSanityCheck;
  const checklist = analysis.causalChecklist;
  const checklistDone = Object.values(checklist).filter(Boolean).length;
  const answered = analysis.ceoAnswers.filter((a) => a.answer.trim().length > 0).length;

  return (
    <div>
      <div className="row-between mb-2">
        <div>
          <h1 style={{ marginBottom: '0.25rem' }}>{company.name}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge badge-accent">{analysis.geometry}</span>
            <span className="chip">confidence {(analysis.geometryConfidence * 100).toFixed(0)}%</span>
            <span className="chip">{analysis.rungLevel === 'RUNG_2' ? 'Rung 2 — causal' : 'Rung 1 — observational'}</span>
            <DecisionBadge decision={analysis.recommendation.decision} />
          </div>
        </div>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const r = runAnalysis(id);
            if (r) navigate(0);
          }}
        >
          ↻ Re-run analysis
        </button>
      </div>

      <div className="grid grid-4 mb-2">
        <Stat label="S_N (seat leverage)" value={analysis.sobol.sN.toFixed(2)} />
        <Stat
          label="Median payback"
          value={`${analysis.fermi.paybackMonthsMid.toFixed(0)} mo`}
        />
        <Stat label="Fragility φ" value={analysis.recommendation.fragilityPhi.toFixed(2)} />
        <Stat
          label="P(acquire | E)"
          value={`${(analysis.recommendation.pAcquire * 100).toFixed(1)}%`}
        />
      </div>

      <div className={sanity.withinTolerance ? 'callout callout-green' : 'callout'}>
        <div className="callout-title">MRR sanity check (Y = N × A × (1 − c))</div>
        Computed <Money cents={sanity.computedMrrCents} /> vs reported{' '}
        <Money cents={sanity.reportedMrrCents} /> — deviation{' '}
        {(sanity.deviationPct * 100).toFixed(1)}%{' '}
        {sanity.withinTolerance ? '(within the 5% tolerance)' : '(EXCEEDS 5% — flag for data quality review)'}
      </div>

      <div className="grid grid-4 mb-2">
        <Link to={`/sobol/${id}`} className="card" style={{ margin: 0 }}>
          <h3>Sobol Analysis →</h3>
          <p className="muted" style={{ margin: 0 }}>
            Variance decomposition, leverage calculator, sensitivity surface.
          </p>
        </Link>
        <Link to={`/fermi/${id}`} className="card" style={{ margin: 0 }}>
          <h3>Fermi Valuation →</h3>
          <p className="muted" style={{ margin: 0 }}>
            Monte Carlo acquisition pricing, payback distribution.
          </p>
        </Link>
        <Link to={`/recommendation/${id}`} className="card" style={{ margin: 0 }}>
          <h3>Recommendation →</h3>
          <p className="muted" style={{ margin: 0 }}>
            Posterior, fragility, VOI and the final decision.
          </p>
        </Link>
        <Link to={`/pilot/${id}`} className="card" style={{ margin: 0 }}>
          <h3>90-Day Pilot →</h3>
          <p className="muted" style={{ margin: 0 }}>
            Protocol, budget, milestones, go/no-go criteria.
          </p>
        </Link>
      </div>

      <div className="card">
        <h2 className="card-title">
          Causal validation checklist — {checklistDone}/4 (Rung 2)
        </h2>
        {CHECKLIST_ITEMS.map((item) => (
          <div className="field" key={item.key} style={{ marginBottom: '0.4rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
              <input
                type="checkbox"
                style={{ width: 'auto', minHeight: 'auto' }}
                checked={checklist[item.key]}
                onChange={(e) => updateCausalChecklist(id, { [item.key]: e.target.checked })}
              />
              {item.label}
            </label>
          </div>
        ))}
        {checklistDone < 4 ? (
          <p className="hint" style={{ marginBottom: 0 }}>
            Completion &lt; 100% — a causal boundary caveat is appended to all exports.
          </p>
        ) : null}
      </div>

      <h2 className="mb-1">Stress tests</h2>
      <div className="stress-grid mb-2">
        {analysis.stressTests.map((t) => (
          <StressCard key={t.testNumber} result={t} />
        ))}
      </div>

      <h2 className="mb-1">The 12 CEO questions</h2>
      <ProgressBar done={answered} total={analysis.ceoAnswers.length} />
      {analysis.ceoAnswers.map((a) => (
        <QuestionCard
          key={a.questionNumber}
          answer={a}
          onSave={(patch) => updateCeoAnswer(id, a.questionNumber, patch)}
        />
      ))}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { latestAnalysisFor, useAppStore } from '../store';
import { Money } from '../components/Money';
import { DecisionBadge, EmptyState, Stat } from '../components/ui';

export function Dashboard() {
  const companies = useAppStore((s) => s.companies);
  const analyses = useAppStore((s) => s.analyses);

  const latest = companies
    .map((c) => ({ company: c, analysis: latestAnalysisFor(analyses, c.id) }))
    .sort((a, b) => b.company.updatedAt.localeCompare(a.company.updatedAt));

  const totalMrr = companies.reduce((acc, c) => acc + c.mrrCents, 0);
  const decisions = { ACQUIRE: 0, PILOT: 0, DEFER: 0 };
  for (const { analysis } of latest) {
    if (analysis) decisions[analysis.recommendation.decision]++;
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        icon="◔"
        title="Analyze your first acquisition target"
        message="Feed in a sub-$20K MRR SaaS and the machine decomposes its revenue variance, values it with Fermi Monte Carlo, stress-tests the thesis, and returns ACQUIRE, PILOT or DEFER."
        action={
          <Link to="/analyze/new" className="btn btn-primary">
            New Analysis
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="row-between mb-2">
        <h1>Dashboard</h1>
        <Link to="/analyze/new" className="btn btn-primary">
          + New Analysis
        </Link>
      </div>

      <div className="grid grid-4 mb-2">
        <Stat label="Companies tracked" value={companies.length} />
        <Stat label="Combined MRR" value={<Money cents={totalMrr} />} />
        <Stat label="Analyses run" value={analyses.length} />
        <Stat
          label="Decisions"
          value={
            <span style={{ fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--green)' }}>{decisions.ACQUIRE}A</span>
              {' / '}
              <span style={{ color: 'var(--amber)' }}>{decisions.PILOT}P</span>
              {' / '}
              <span style={{ color: 'var(--red)' }}>{decisions.DEFER}D</span>
            </span>
          }
        />
      </div>

      <h2 className="mb-1">Recent companies</h2>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Industry</th>
              <th>MRR</th>
              <th>Geometry</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {latest.slice(0, 10).map(({ company, analysis }) => (
              <tr key={company.id}>
                <td>
                  <Link to={`/companies/${company.id}`}>{company.name}</Link>
                </td>
                <td className="muted">{company.industryVertical}</td>
                <td>
                  <Money cents={company.mrrCents} />
                </td>
                <td className="muted">{analysis?.geometry ?? '—'}</td>
                <td>
                  {analysis ? (
                    <Link to={`/recommendation/${company.id}`}>
                      <DecisionBadge decision={analysis.recommendation.decision} />
                    </Link>
                  ) : (
                    <Link to={`/analyze/${company.id}`} className="chip">
                      Run analysis
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

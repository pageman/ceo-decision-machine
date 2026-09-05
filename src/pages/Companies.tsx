import { Link, useNavigate } from 'react-router-dom';
import { latestAnalysisFor, useAppStore } from '../store';
import { Money } from '../components/Money';
import { DecisionBadge, EmptyState } from '../components/ui';

export function Companies() {
  const companies = useAppStore((s) => s.companies);
  const analyses = useAppStore((s) => s.analyses);
  const navigate = useNavigate();

  if (companies.length === 0) {
    return (
      <EmptyState
        icon="▦"
        title="No companies yet"
        message="Add an acquisition target to start building your portfolio."
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
        <h1>Companies</h1>
        <Link to="/analyze/new" className="btn btn-primary">
          + Add
        </Link>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Industry</th>
              <th>MRR</th>
              <th>Seats</th>
              <th>Churn</th>
              <th>Geometry</th>
              <th>Decision</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const analysis = latestAnalysisFor(analyses, c.id);
              return (
                <tr
                  key={c.id}
                  className="clickable-row"
                  onClick={() => navigate(`/companies/${c.id}`)}
                >
                  <td>{c.name}</td>
                  <td className="muted">{c.industryVertical}</td>
                  <td>
                    <Money cents={c.mrrCents} />
                  </td>
                  <td className="mono">{c.seatCount}</td>
                  <td className="mono">{(c.churnRate * 100).toFixed(1)}%</td>
                  <td className="muted">{analysis?.geometry ?? '—'}</td>
                  <td>{analysis ? <DecisionBadge decision={analysis.recommendation.decision} /> : '—'}</td>
                  <td className="muted">{new Date(c.updatedAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

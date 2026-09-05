import { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { useAppStore as store } from '../store';
import { EmptyState, TierBadge } from '../components/ui';
import { fromCents, toCents } from '../components/Money';
import type { EvidenceSourceType, EvidenceTier } from '../types';

const SOURCE_TYPES: { value: EvidenceSourceType; label: string }[] = [
  { value: 'stripe_direct', label: 'Stripe (direct)' },
  { value: 'bir_or', label: 'BIR Official Receipt' },
  { value: 'trustmrr_scrape', label: 'TrustMRR listing' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'g2_reviews', label: 'G2/Capterra reviews' },
  { value: 'subreddit', label: 'Subreddit' },
  { value: 'synthetic', label: 'Synthetic estimate' },
  { value: 'experimental', label: 'Experiment' },
  { value: 'pilot', label: 'Pilot result' },
];

const TIER_HINT: Record<number, string> = {
  0: 'Direct observation (Stripe API, BIR OR, bank statements)',
  1: 'Primary source proxy (TrustMRR with Stripe badge)',
  2: 'Secondary structured (LinkedIn, G2)',
  3: 'Inferred from multiple Tier-2 sources',
  4: 'Synthetic phenomenology',
  5: 'Pure synthetic (Fermi estimates)',
  6: 'Industry benchmark proxy',
  7: 'Experimentally verified (pilots, A/B tests)',
};

export function EvidencePage() {
  const companies = useAppStore((s) => s.companies);
  const evidence = useAppStore((s) => s.evidence);
  const addEvidence = useAppStore((s) => s.addEvidence);
  const deleteEvidence = useAppStore((s) => s.deleteEvidence);
  const verifyEvidence = useAppStore((s) => s.verifyEvidence);
  const settings = store((s) => s.settings);

  const [filterCompany, setFilterCompany] = useState('');
  const [filterTier, setFilterTier] = useState('');

  const [form, setForm] = useState({
    companyId: '',
    tier: 2 as EvidenceTier,
    sourceType: 'linkedin' as EvidenceSourceType,
    title: '',
    notes: '',
    alphaPilot: '',
    reportedMrr: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      evidence
        .filter((e) => (filterCompany ? e.companyId === filterCompany : true))
        .filter((e) => (filterTier !== '' ? e.tier === Number(filterTier) : true))
        .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt)),
    [evidence, filterCompany, filterTier],
  );

  const companyName = (cid: string) => companies.find((c) => c.id === cid)?.name ?? '—';
  const showAlpha = form.sourceType === 'pilot' || form.sourceType === 'experimental';
  const showMrr = form.tier <= 1;

  const submit = () => {
    if (!form.companyId) return setFormError('Select a company.');
    if (!form.title.trim()) return setFormError('Title is required.');
    const dataPayload: Record<string, unknown> = {};
    if (showAlpha && form.alphaPilot !== '') dataPayload.alphaPilot = Number(form.alphaPilot);
    if (showMrr && form.reportedMrr !== '')
      dataPayload.reportedMrrCents = toCents(Number(form.reportedMrr), settings);
    addEvidence({
      companyId: form.companyId,
      tier: form.tier,
      sourceType: form.sourceType,
      title: form.title.trim(),
      notes: form.notes.trim() || undefined,
      dataPayload,
      verified: false,
    });
    setForm({ ...form, title: '', notes: '', alphaPilot: '', reportedMrr: '' });
    setFormError(null);
  };

  return (
    <div>
      <h1 className="mb-2">Evidence Ledger</h1>

      <div className="card">
        <h2 className="card-title">Add evidence</h2>
        <div className="form-row">
          <div className="field">
            <label htmlFor="ev-company">Company *</label>
            <select
              id="ev-company"
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              <option value="">Select…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-title">Title *</label>
            <input
              id="ev-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Stripe screenshot March"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="ev-tier">Tier</label>
            <select
              id="ev-tier"
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: Number(e.target.value) as EvidenceTier })}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
                <option key={t} value={t}>
                  Tier {t} — {TIER_HINT[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ev-source">Source type</label>
            <select
              id="ev-source"
              value={form.sourceType}
              onChange={(e) =>
                setForm({ ...form, sourceType: e.target.value as EvidenceSourceType })
              }
            >
              {SOURCE_TYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {showAlpha || showMrr ? (
          <div className="form-row">
            {showAlpha ? (
              <div className="field">
                <label htmlFor="ev-alpha">Measured ad elasticity (α_pilot)</label>
                <input
                  id="ev-alpha"
                  type="number"
                  step="any"
                  min={0}
                  value={form.alphaPilot}
                  onChange={(e) => setForm({ ...form, alphaPilot: e.target.value })}
                  placeholder="e.g. 2.3"
                />
              </div>
            ) : null}
            {showMrr ? (
              <div className="field">
                <label htmlFor="ev-mrr">
                  MRR seen by this source ({settings.displayCurrency === 'PHP' ? '₱' : '$'})
                </label>
                <input
                  id="ev-mrr"
                  type="number"
                  min={0}
                  value={form.reportedMrr}
                  onChange={(e) => setForm({ ...form, reportedMrr: e.target.value })}
                  placeholder={
                    settings.displayCurrency === 'PHP'
                      ? 'e.g. 560000'
                      : `e.g. ${fromCents(1_000_000, settings)}`
                  }
                />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="ev-notes">Notes</label>
          <textarea
            id="ev-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        {formError ? (
          <div className="error-text" role="alert">
            {formError}
          </div>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={submit}>
          Add to ledger
        </button>
      </div>

      <div className="row-between mb-1">
        <h2 style={{ margin: 0 }}>Ledger ({filtered.length})</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            aria-label="Filter by company"
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            style={{ minHeight: 40, borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by tier"
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            style={{ minHeight: 40, borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value="">All tiers</option>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
              <option key={t} value={t}>
                Tier {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="◈"
          title="No evidence yet"
          message="Evidence feeds the credibility model, the fraud cross-check, and the causal (Rung 2) upgrades."
        />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tier</th>
                <th>Source</th>
                <th>Title</th>
                <th>Company</th>
                <th>Credibility</th>
                <th>Collected</th>
                <th>Verified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <TierBadge tier={e.tier} />
                  </td>
                  <td className="muted">{e.sourceType}</td>
                  <td>{e.title}</td>
                  <td className="muted">{companyName(e.companyId)}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div className="mini-track" style={{ flex: 1 }}>
                        <div
                          className="mini-fill"
                          style={{
                            width: `${e.credibilityScore * 100}%`,
                            background:
                              e.credibilityScore >= 0.7
                                ? 'var(--green)'
                                : e.credibilityScore >= 0.4
                                  ? 'var(--amber)'
                                  : 'var(--red)',
                          }}
                        />
                      </div>
                      <span className="mono">{(e.credibilityScore * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="muted">{new Date(e.collectedAt).toLocaleDateString()}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      title={e.verified ? 'Verified' : 'Mark verified'}
                      disabled={e.verified}
                      onClick={() => verifyEvidence(e.id)}
                    >
                      {e.verified ? '★' : '☆'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => deleteEvidence(e.id)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

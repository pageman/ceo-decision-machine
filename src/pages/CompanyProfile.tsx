import { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { Money } from '../components/Money';
import { ConfirmButton, TierBadge } from '../components/ui';
import { MoneyField, NumberField, PercentField } from '../components/fields';
import type { TargetAudience } from '../types';

export function CompanyProfile() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const company = useAppStore((s) => s.companies.find((c) => c.id === id));
  const evidence = useAppStore((s) => s.evidence.filter((e) => e.companyId === id));
  const updateCompany = useAppStore((s) => s.updateCompany);
  const deleteCompany = useAppStore((s) => s.deleteCompany);
  const runAnalysis = useAppStore((s) => s.runAnalysis);

  const [form, setForm] = useState(() => ({ ...company }));
  const [saved, setSaved] = useState(false);

  if (!company) return <Navigate to="/companies" replace />;
  const f = { ...company, ...form };
  const set = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <div>
      <div className="row-between mb-2">
        <h1>{company.name}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const result = runAnalysis(company.id);
              if (result) navigate(`/analyze/${company.id}`);
            }}
          >
            Run Analysis
          </button>
          <ConfirmButton
            label="Delete"
            confirmLabel="Confirm delete?"
            onConfirm={() => {
              deleteCompany(company.id);
              navigate('/companies');
            }}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Company profile</h2>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cp-name">Name</label>
            <input id="cp-name" value={f.name ?? ''} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cp-domain">Domain</label>
            <input
              id="cp-domain"
              value={f.domain ?? ''}
              onChange={(e) => set('domain', e.target.value)}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label htmlFor="cp-industry">Industry vertical</label>
            <input
              id="cp-industry"
              value={f.industryVertical ?? ''}
              onChange={(e) => set('industryVertical', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="cp-country">Country code</label>
            <input
              id="cp-country"
              maxLength={2}
              value={f.countryCode ?? ''}
              onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
            />
          </div>
        </div>
        <div className="form-row">
          <MoneyField
            id="cp-mrr"
            label="MRR"
            valueCents={f.mrrCents ?? 0}
            onChangeCents={(v) => set('mrrCents', v)}
          />
          <MoneyField
            id="cp-arpu"
            label="ARPU"
            valueCents={f.arpuCents ?? 0}
            onChangeCents={(v) => set('arpuCents', v)}
          />
        </div>
        <div className="form-row">
          <NumberField
            id="cp-seats"
            label="Seat count"
            value={f.seatCount ?? 0}
            onChange={(v) => set('seatCount', Math.round(v))}
          />
          <PercentField
            id="cp-churn"
            label="Monthly churn"
            value={f.churnRate ?? 0}
            onChange={(v) => set('churnRate', v)}
          />
        </div>
        <div className="form-row">
          <NumberField
            id="cp-employees"
            label="Employee count (optional)"
            value={f.employeeCount ?? 0}
            onChange={(v) => set('employeeCount', Math.round(v))}
          />
          <NumberField
            id="cp-tx"
            label="Monthly transactions (optional)"
            value={f.transactionVolume ?? 0}
            onChange={(v) => set('transactionVolume', Math.round(v))}
          />
        </div>
        <div className="form-row">
          <MoneyField
            id="cp-adbudget"
            label="Monthly ad budget (optional)"
            valueCents={f.adSpendBudgetCents ?? 0}
            onChangeCents={(v) => set('adSpendBudgetCents', v)}
          />
          <div className="field">
            <label htmlFor="cp-audience">Target audience</label>
            <select
              id="cp-audience"
              value={f.targetAudience ?? 'global'}
              onChange={(e) => set('targetAudience', e.target.value as TargetAudience)}
            >
              <option value="global">Global</option>
              <option value="us">US</option>
              <option value="ph">Philippines</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="cp-team">
            Team readiness{' '}
            <span className="mono" style={{ float: 'right', color: 'var(--text)' }}>
              {f.teamReadinessScore ?? 0}/100
            </span>
          </label>
          <input
            id="cp-team"
            type="range"
            min={0}
            max={100}
            value={f.teamReadinessScore ?? 0}
            onChange={(e) => set('teamReadinessScore', Number(e.target.value))}
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const { id: _id, createdAt: _c, updatedAt: _u, ...patch } = f;
            updateCompany(company.id, patch);
            setSaved(true);
          }}
        >
          {saved ? 'Saved ✓' : 'Save changes'}
        </button>
      </div>

      <div className="card">
        <div className="row-between mb-1">
          <h2 className="card-title" style={{ margin: 0 }}>
            Evidence ({evidence.length})
          </h2>
          <Link to="/evidence" className="btn btn-sm">
            Open ledger
          </Link>
        </div>
        {evidence.length === 0 ? (
          <p className="muted">No evidence attached yet.</p>
        ) : (
          evidence.map((e) => (
            <div key={e.id} className="row-between" style={{ padding: '0.35rem 0' }}>
              <span>
                <TierBadge tier={e.tier} /> {e.title}
              </span>
              <span className="muted mono">{(e.credibilityScore * 100).toFixed(0)}%</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Quick stats</h2>
        <p className="muted" style={{ margin: 0 }}>
          MRR <Money cents={company.mrrCents} /> · ARR <Money cents={company.mrrCents * 12} /> ·{' '}
          {company.seatCount} seats · {(company.churnRate * 100).toFixed(1)}% churn
        </p>
      </div>
    </div>
  );
}

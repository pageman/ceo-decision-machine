import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { MoneyField, NumberField, PercentField } from '../components/fields';
import type {
  EvidenceSourceType,
  EvidenceTier,
  PricingTier,
  RevenueModelType,
  TargetAudience,
} from '../types';

const DRAFT_KEY = 'cdm-wizard-draft';

interface EvidenceDraft {
  tier: EvidenceTier;
  sourceType: EvidenceSourceType;
  title: string;
}

interface WizardDraft {
  step: number;
  name: string;
  domain: string;
  industryVertical: string;
  countryCode: string;
  mrrCents: number;
  arpuCents: number;
  seatCount: number;
  churnRate: number; // fraction
  pricingTiers: PricingTier[];
  employeeCount: number;
  transactionVolume: number;
  geometry: '' | RevenueModelType;
  evidenceDraft: EvidenceDraft[];
  targetAudience: TargetAudience;
  adSpendBudgetCents: number;
  teamReadinessScore: number;
}

const EMPTY_DRAFT: WizardDraft = {
  step: 0,
  name: '',
  domain: '',
  industryVertical: '',
  countryCode: 'PH',
  mrrCents: 0,
  arpuCents: 0,
  seatCount: 0,
  churnRate: 0.05,
  pricingTiers: [],
  employeeCount: 0,
  transactionVolume: 0,
  geometry: '',
  evidenceDraft: [],
  targetAudience: 'global',
  adSpendBudgetCents: 0,
  teamReadinessScore: 50,
};

const STEP_TITLES = ['Basics', 'Revenue', 'Geometry', 'Evidence', 'Context'];

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

function loadDraft(): WizardDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<WizardDraft>) };
  } catch {
    // corrupted draft → start fresh
  }
  return EMPTY_DRAFT;
}

export function NewAnalysis() {
  const navigate = useNavigate();
  const addCompany = useAppStore((s) => s.addCompany);
  const addEvidence = useAppStore((s) => s.addEvidence);
  const runAnalysis = useAppStore((s) => s.runAnalysis);

  const [draft, setDraft] = useState<WizardDraft>(loadDraft);
  const set = <K extends keyof WizardDraft>(key: K, value: WizardDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  const stepError = useMemo(() => {
    switch (draft.step) {
      case 0:
        if (!draft.name.trim()) return 'Company name is required.';
        if (!draft.industryVertical.trim()) return 'Industry vertical is required.';
        if (!/^[A-Za-z]{2}$/.test(draft.countryCode)) return 'Country code must be 2 letters.';
        return null;
      case 1:
        if (draft.mrrCents <= 0) return 'MRR must be greater than zero.';
        if (draft.arpuCents <= 0) return 'ARPU must be greater than zero.';
        if (draft.seatCount <= 0) return 'Seat count must be greater than zero.';
        if (draft.churnRate < 0 || draft.churnRate > 1) return 'Churn must be between 0 and 100%.';
        return null;
      case 3:
        if (draft.evidenceDraft.some((e) => !e.title.trim()))
          return 'Every evidence row needs a title (or remove it).';
        return null;
      default:
        return null;
    }
  }, [draft]);

  const finish = () => {
    const company = addCompany({
      name: draft.name.trim(),
      domain: draft.domain.trim() || undefined,
      industryVertical: draft.industryVertical.trim(),
      countryCode: draft.countryCode.toUpperCase(),
      revenueModelType: draft.geometry === '' ? undefined : draft.geometry,
      mrrCents: draft.mrrCents,
      arpuCents: draft.arpuCents,
      seatCount: draft.seatCount,
      churnRate: draft.churnRate,
      pricingTiers: draft.pricingTiers.filter((t) => t.name.trim() && t.priceCents > 0),
      employeeCount: draft.employeeCount > 0 ? draft.employeeCount : undefined,
      transactionVolume: draft.transactionVolume > 0 ? draft.transactionVolume : undefined,
      adSpendBudgetCents: draft.adSpendBudgetCents > 0 ? draft.adSpendBudgetCents : undefined,
      targetAudience: draft.targetAudience,
      teamReadinessScore: draft.teamReadinessScore,
    });
    for (const e of draft.evidenceDraft) {
      addEvidence({
        companyId: company.id,
        tier: e.tier,
        sourceType: e.sourceType,
        title: e.title.trim(),
        dataPayload: {},
        verified: false,
      });
    }
    const result = runAnalysis(company.id);
    localStorage.removeItem(DRAFT_KEY);
    if (result) navigate(`/analyze/${company.id}`);
  };

  const isLast = draft.step === STEP_TITLES.length - 1;

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 className="mb-1">New Company Analysis</h1>
      <p className="muted mb-2">
        Step {draft.step + 1} of {STEP_TITLES.length} — {STEP_TITLES[draft.step]}
      </p>
      <div className="wizard-steps" aria-hidden>
        {STEP_TITLES.map((t, i) => (
          <div key={t} className={`wstep${i <= draft.step ? ' done' : ''}`} />
        ))}
      </div>

      <div className="card">
        {draft.step === 0 && (
          <>
            <div className="form-row">
              <div className="field">
                <label htmlFor="wz-name">Company name *</label>
                <input
                  id="wz-name"
                  value={draft.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Lista"
                />
              </div>
              <div className="field">
                <label htmlFor="wz-domain">Domain / URL</label>
                <input
                  id="wz-domain"
                  value={draft.domain}
                  onChange={(e) => set('domain', e.target.value)}
                  placeholder="example.com"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label htmlFor="wz-industry">Industry vertical *</label>
                <input
                  id="wz-industry"
                  value={draft.industryVertical}
                  onChange={(e) => set('industryVertical', e.target.value)}
                  placeholder="e.g. bookkeeping SaaS"
                />
              </div>
              <div className="field">
                <label htmlFor="wz-country">Country code *</label>
                <input
                  id="wz-country"
                  maxLength={2}
                  value={draft.countryCode}
                  onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </>
        )}

        {draft.step === 1 && (
          <>
            <div className="form-row">
              <MoneyField
                id="wz-mrr"
                label="MRR *"
                valueCents={draft.mrrCents}
                onChangeCents={(v) => set('mrrCents', v)}
                hint="Reported monthly recurring revenue."
              />
              <MoneyField
                id="wz-arpu"
                label="ARPU *"
                valueCents={draft.arpuCents}
                onChangeCents={(v) => set('arpuCents', v)}
                hint="Average revenue per account per month."
              />
            </div>
            <div className="form-row">
              <NumberField
                id="wz-seats"
                label="Seat count *"
                value={draft.seatCount}
                onChange={(v) => set('seatCount', Math.round(v))}
                hint="Paying accounts/seats. Sanity: MRR ≈ seats × ARPU × (1 − churn)."
              />
              <PercentField
                id="wz-churn"
                label="Monthly churn *"
                value={draft.churnRate}
                onChange={(v) => set('churnRate', v)}
              />
            </div>
            <div className="form-row">
              <NumberField
                id="wz-employees"
                label="Employee count"
                value={draft.employeeCount}
                onChange={(v) => set('employeeCount', Math.round(v))}
                hint="Enables the CSM-ratio constraint (1:100–1:200)."
              />
              <NumberField
                id="wz-tx"
                label="Monthly transactions"
                value={draft.transactionVolume}
                onChange={(v) => set('transactionVolume', Math.round(v))}
                hint="Volume-attach signal. Leave 0 if seat-driven."
              />
            </div>
            <div className="field">
              <label>Pricing tiers</label>
              {draft.pricingTiers.map((tier, i) => (
                <div className="tier-row" key={i}>
                  <input
                    aria-label={`Tier ${i + 1} name`}
                    placeholder="Tier name"
                    value={tier.name}
                    onChange={(e) =>
                      set(
                        'pricingTiers',
                        draft.pricingTiers.map((t, j) =>
                          j === i ? { ...t, name: e.target.value } : t,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label={`Tier ${i + 1} price in cents`}
                    type="number"
                    min={0}
                    placeholder="price (USD/mo)"
                    value={tier.priceCents === 0 ? '' : tier.priceCents / 100}
                    onChange={(e) =>
                      set(
                        'pricingTiers',
                        draft.pricingTiers.map((t, j) =>
                          j === i
                            ? { ...t, priceCents: Math.round(Number(e.target.value) * 100) }
                            : t,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      set(
                        'pricingTiers',
                        draft.pricingTiers.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm"
                onClick={() =>
                  set('pricingTiers', [...draft.pricingTiers, { name: '', priceCents: 0 }])
                }
              >
                + Add tier
              </button>
              <div className="hint">Tier bounds define the ARPU prior for the Sobol engine.</div>
            </div>
          </>
        )}

        {draft.step === 2 && (
          <div className="field">
            <label htmlFor="wz-geometry">Revenue geometry</label>
            <select
              id="wz-geometry"
              value={draft.geometry}
              onChange={(e) => set('geometry', e.target.value as WizardDraft['geometry'])}
            >
              <option value="">Auto-classify (recommended)</option>
              <option value="seat_ladder">Seat-Ladder (SL) — seats drive revenue</option>
              <option value="volume_attach">Volume-Attach (VA) — transactions drive revenue</option>
              <option value="usage_based">Usage-Based (UB) — API/storage metrics drive revenue</option>
              <option value="hybrid">Hybrid (H) — mixed signals</option>
            </select>
            <div className="hint">
              Sub-$20K MRR companies default to SEAT_LADDER with a 0.95 prior (paper §2.1). Override
              only with strong evidence.
            </div>
          </div>
        )}

        {draft.step === 3 && (
          <>
            <p className="muted">
              Attach any evidence you already hold (optional — you can add more in the ledger later).
            </p>
            {draft.evidenceDraft.map((item, i) => (
              <div className="tier-row" key={i}>
                <select
                  aria-label={`Evidence ${i + 1} tier`}
                  value={item.tier}
                  onChange={(e) =>
                    set(
                      'evidenceDraft',
                      draft.evidenceDraft.map((x, j) =>
                        j === i ? { ...x, tier: Number(e.target.value) as EvidenceTier } : x,
                      ),
                    )
                  }
                  style={{ maxWidth: 90 }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
                    <option key={t} value={t}>
                      T{t}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Evidence ${i + 1} source`}
                  value={item.sourceType}
                  onChange={(e) =>
                    set(
                      'evidenceDraft',
                      draft.evidenceDraft.map((x, j) =>
                        j === i ? { ...x, sourceType: e.target.value as EvidenceSourceType } : x,
                      ),
                    )
                  }
                >
                  {SOURCE_TYPES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Evidence ${i + 1} title`}
                  placeholder="Title"
                  value={item.title}
                  onChange={(e) =>
                    set(
                      'evidenceDraft',
                      draft.evidenceDraft.map((x, j) =>
                        j === i ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() =>
                    set(
                      'evidenceDraft',
                      draft.evidenceDraft.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() =>
                set('evidenceDraft', [
                  ...draft.evidenceDraft,
                  { tier: 2, sourceType: 'linkedin', title: '' },
                ])
              }
            >
              + Add evidence
            </button>
          </>
        )}

        {draft.step === 4 && (
          <>
            <div className="form-row">
              <div className="field">
                <label htmlFor="wz-audience">Target audience</label>
                <select
                  id="wz-audience"
                  value={draft.targetAudience}
                  onChange={(e) => set('targetAudience', e.target.value as TargetAudience)}
                >
                  <option value="global">Global</option>
                  <option value="us">US</option>
                  <option value="ph">Philippines</option>
                </select>
              </div>
              <MoneyField
                id="wz-adbudget"
                label="Monthly ad budget under consideration"
                valueCents={draft.adSpendBudgetCents}
                onChangeCents={(v) => set('adSpendBudgetCents', v)}
              />
            </div>
            <div className="field">
              <label htmlFor="wz-team">
                Team readiness score{' '}
                <span className="mono" style={{ float: 'right', color: 'var(--text)' }}>
                  {draft.teamReadinessScore}/100
                </span>
              </label>
              <input
                id="wz-team"
                type="range"
                min={0}
                max={100}
                value={draft.teamReadinessScore}
                onChange={(e) => set('teamReadinessScore', Number(e.target.value))}
              />
              <div className="hint">
                Can your team run the paid-acquisition playbook post-acquisition?
              </div>
            </div>
          </>
        )}

        {stepError ? <div className="error-text" role="alert">{stepError}</div> : null}

        <div className="wizard-nav">
          <button
            type="button"
            className="btn"
            disabled={draft.step === 0}
            onClick={() => set('step', Math.max(0, draft.step - 1))}
          >
            ← Back
          </button>
          {isLast ? (
            <button type="button" className="btn btn-primary" disabled={!!stepError} onClick={finish}>
              Run full analysis →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!!stepError}
              onClick={() => set('step', Math.min(STEP_TITLES.length - 1, draft.step + 1))}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

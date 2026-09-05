import { useAppStore } from '../store';
import { ConfirmButton } from '../components/ui';

export function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const clearAllData = useAppStore((s) => s.clearAllData);

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 className="mb-2">Settings</h1>

      <div className="card">
        <h2 className="card-title">Decision thresholds</h2>
        <div className="field">
          <label htmlFor="set-epsilon">ε — VOI threshold (USD)</label>
          <input
            id="set-epsilon"
            type="number"
            min={0}
            step={1000}
            value={settings.epsilonVoiCents / 100}
            onChange={(e) =>
              updateSettings({ epsilonVoiCents: Math.round(Number(e.target.value) * 100) })
            }
          />
          <div className="hint">
            If VOI_max ≥ ε the decision is overridden to PILOT. Default $50,000.
          </div>
        </div>
        <div className="field">
          <label htmlFor="set-alpha">Default α — seat acquisition multiplier</label>
          <input
            id="set-alpha"
            type="number"
            min={1}
            step={0.1}
            value={settings.defaultAlpha}
            onChange={(e) => updateSettings({ defaultAlpha: Math.max(1, Number(e.target.value)) })}
          />
          <div className="hint">Used for the Proposition 1 point estimate (e.g. 1.5 = +50% seats).</div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Display</h2>
        <div className="form-row">
          <div className="field">
            <label htmlFor="set-currency">Display currency</label>
            <select
              id="set-currency"
              value={settings.displayCurrency}
              onChange={(e) =>
                updateSettings({ displayCurrency: e.target.value as 'USD' | 'PHP' })
              }
            >
              <option value="USD">USD ($)</option>
              <option value="PHP">PHP (₱)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="set-rate">PHP per USD</label>
            <input
              id="set-rate"
              type="number"
              min={1}
              step="any"
              value={settings.phpPerUsd}
              onChange={(e) => updateSettings({ phpPerUsd: Math.max(1, Number(e.target.value)) })}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="set-expert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              id="set-expert"
              type="checkbox"
              style={{ width: 'auto', minHeight: 'auto' }}
              checked={settings.expertMode}
              onChange={(e) => updateSettings({ expertMode: e.target.checked })}
            />
            Expert mode (show raw computation parameters)
          </label>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">Data</h2>
        <p className="muted">
          All data lives on this device (localStorage). Clearing removes every company, analysis and
          evidence item.
        </p>
        <ConfirmButton
          label="Clear all data"
          confirmLabel="Really clear everything?"
          onConfirm={clearAllData}
        />
      </div>

      <p className="muted">CEO Decision Machine v0.1.0 — offline-first PWA.</p>
    </div>
  );
}

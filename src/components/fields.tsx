import { useAppStore } from '../store';
import { fromCents, toCents } from './Money';

/** Money input in the display currency; value is kept in cents. */
export function MoneyField({
  id,
  label,
  valueCents,
  onChangeCents,
  hint,
}: {
  id: string;
  label: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  hint?: string;
}) {
  const settings = useAppStore((s) => s.settings);
  const symbol = settings.displayCurrency === 'PHP' ? '₱' : '$';
  const text = valueCents === 0 ? '' : String(fromCents(valueCents, settings));
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} ({symbol})
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        placeholder="0"
        value={text}
        onChange={(e) =>
          onChangeCents(e.target.value === '' ? 0 : toCents(Math.max(0, Number(e.target.value)), settings))
        }
      />
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="number"
        min={min}
        step={step}
        inputMode="numeric"
        value={value === 0 ? '' : String(value)}
        placeholder="0"
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

/** Percent input displayed as a number 0–100, stored as a fraction 0–1. */
export function PercentField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number; // fraction 0..1
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label} (%)</label>
      <input
        id={id}
        type="number"
        min={0}
        max={100}
        step="any"
        inputMode="decimal"
        value={value === 0 ? '' : String(Number((value * 100).toFixed(2)))}
        placeholder="0"
        onChange={(e) =>
          onChange(e.target.value === '' ? 0 : Math.min(1, Math.max(0, Number(e.target.value) / 100)))
        }
      />
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

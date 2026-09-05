interface ProbabilityBarProps {
  label: string;
  value: number; // 0..1
  color?: string;
}

export default function ProbabilityBar({ label, value, color }: ProbabilityBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  return (
    <div className="pbar">
      <div className="pbar__header">
        <span className="text-muted">{label}</span>
        <span className="pbar__value">{(clamped * 100).toFixed(1)}%</span>
      </div>
      <div
        className="pbar__track"
        role="progressbar"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="pbar__fill"
          style={{ width: `${clamped * 100}%`, background: color ?? 'var(--accent)' }}
        />
      </div>
    </div>
  );
}

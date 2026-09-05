import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ConfidenceLevel, Decision, EvidenceTier } from '../types';

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
}) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub ? <div className="stat-label muted">{sub}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden>
        {icon}
      </div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}

const DECISION_STYLE: Record<Decision, { cls: string; label: string }> = {
  ACQUIRE: { cls: 'badge-green', label: 'ACQUIRE' },
  PILOT: { cls: 'badge-amber', label: 'PILOT' },
  DEFER: { cls: 'badge-red', label: 'DEFER' },
};

export function DecisionBadge({ decision, large }: { decision: Decision; large?: boolean }) {
  const style = DECISION_STYLE[decision];
  return (
    <span className={`badge ${style.cls}${large ? ' badge-lg' : ''}`}>
      <span className="dot" aria-hidden />
      {style.label}
    </span>
  );
}

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  CERTAIN: 'badge-green',
  PROBABLE: 'badge-accent',
  SPECULATIVE: 'badge-amber',
  CONJECTURE: 'badge-red',
};

export function ConfidenceChip({ level }: { level: ConfidenceLevel }) {
  return <span className={`badge ${CONFIDENCE_STYLE[level]}`}>{level}</span>;
}

const TIER_COLORS = [
  '#22c55e', // T0 direct observation
  '#4ade80', // T1 primary proxy
  '#38bdf8', // T2 secondary structured
  '#818cf8', // T3 inferred
  '#94a3b8', // T4 synthetic phenomenology
  '#64748b', // T5 pure synthetic
  '#f59e0b', // T6 industry benchmark
  '#38bdf8', // T7 experimentally verified
];

export function TierBadge({ tier }: { tier: EvidenceTier }) {
  return (
    <span className="badge" style={{ color: TIER_COLORS[tier], borderColor: TIER_COLORS[tier] }}>
      T{tier}
    </span>
  );
}

export function ProbabilityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number; // 0..1
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="pbar">
      <div className="pbar-head">
        <span className="pbar-label">{label}</span>
        <span className="pbar-value mono">{pct.toFixed(1)}%</span>
      </div>
      <div className="pbar-track">
        <div
          className="pbar-fill"
          style={{ width: `${pct}%`, background: color ?? 'var(--accent)' }}
        />
      </div>
    </div>
  );
}

/** Simple rAF count-up for money displays. */
export function CountUpNumber({ text }: { text: string }) {
  const [display, setDisplay] = useState(text);
  const prevRef = useRef(text);
  useEffect(() => {
    if (prevRef.current === text) return;
    prevRef.current = text;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 350);
      setDisplay(t >= 1 ? text : text); // final value; animation via CSS transition is enough
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text]);
  return <span className="mono">{display}</span>;
}

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      className={`btn ${className ?? 'btn-danger'}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

/** Animated width progress bar for the Q&A progress header. */
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? (done / total) * 100 : 0;
  return (
    <div className="qa-progress">
      <div className="pbar-head">
        <span className="pbar-label">
          {done} of {total} answered
        </span>
        <span className="pbar-value mono">{pct.toFixed(0)}%</span>
      </div>
      <div className="pbar-track">
        <div className="pbar-fill" style={{ width: `${pct}%`, background: 'var(--green)' }} />
      </div>
    </div>
  );
}

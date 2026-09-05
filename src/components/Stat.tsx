import type { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export default function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
      {hint ? <div className="text-muted text-small mt-1">{hint}</div> : null}
    </div>
  );
}

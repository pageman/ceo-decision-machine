import type { Decision } from '../types';

interface DecisionBadgeProps {
  decision: Decision;
  size?: 'sm' | 'lg';
}

const DECISION_COLOR: Record<Decision, string> = {
  ACQUIRE: 'green',
  PILOT: 'amber',
  DEFER: 'red',
};

export default function DecisionBadge({ decision, size = 'sm' }: DecisionBadgeProps) {
  const classNames = ['badge', `badge--${DECISION_COLOR[decision]}`];
  if (size === 'lg') classNames.push('badge--lg');
  return <span className={classNames.join(' ')}>{decision}</span>;
}

import type { ConfidenceLevel } from '../types';

interface ConfidenceChipProps {
  level: ConfidenceLevel;
}

const LEVEL_COLOR: Record<ConfidenceLevel, string> = {
  CERTAIN: 'green',
  PROBABLE: 'accent',
  SPECULATIVE: 'amber',
  CONJECTURE: 'muted',
};

const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  CERTAIN: 'Certain',
  PROBABLE: 'Probable',
  SPECULATIVE: 'Speculative',
  CONJECTURE: 'Conjecture',
};

export default function ConfidenceChip({ level }: ConfidenceChipProps) {
  return (
    <span className={`badge badge--${LEVEL_COLOR[level]}`} title={`Confidence: ${LEVEL_LABEL[level]}`}>
      {LEVEL_LABEL[level]}
    </span>
  );
}

import type { EvidenceTier } from '../types';

interface TierBadgeProps {
  tier: EvidenceTier;
}

const TIER_LABEL: Record<EvidenceTier, string> = {
  0: 'Direct ledger',
  1: 'Official record',
  2: 'Verified scrape',
  3: 'Professional network',
  4: 'Reviews',
  5: 'Community',
  6: 'Synthetic',
  7: 'Experimental',
};

export default function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span className={`badge badge--t${tier}`} title={TIER_LABEL[tier]}>
      T{tier}
    </span>
  );
}

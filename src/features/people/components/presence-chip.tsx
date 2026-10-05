import type { PresenceState } from '@/core/types';
import { StatusBadge } from '@/shared/components/ui/status-badge';

type PresenceChipProps = {
  state: PresenceState;
  label: string;
};

const DOT_CLASS: Record<PresenceState, string> = {
  home: 'bg-success',
  away: 'bg-warning',
  unknown: 'bg-muted-foreground',
};

export function PresenceChip({ state, label }: PresenceChipProps) {
  return <StatusBadge label={label} dotClassName={DOT_CLASS[state]} />;
}

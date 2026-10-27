import { useNow } from '@/shared/hooks/use-now';
import { stageStepOf, useHeightLayout } from '@/shared/theme';
import { useArgusResults } from '@/features/voice/hooks/use-argus-results';
import { useResultActions } from '@/features/voice/hooks/use-result-actions';
import { callResultOf } from '@/features/voice/model/argus-result';
import { ArgusResultCard } from '@/features/voice/components/results/argus-result-card';

export type CallResultsProps = { since: number };

const MINUTE_MS = 60_000;

export function CallResults({ since }: CallResultsProps) {
  const results = useArgusResults();
  const actions = useResultActions('call');
  const now = useNow(MINUTE_MS);
  const roomy = stageStepOf(useHeightLayout()) === 'regular';
  const result = callResultOf(results, since);
  if (!result) return null;
  return (
    <ArgusResultCard
      result={result}
      live={roomy && result.kind === 'camera'}
      now={now}
      actions={actions}
    />
  );
}

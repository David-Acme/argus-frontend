import { episodeTitle, needsReview, useEpisodeFeed } from '@/features/security';
import { useMomentFormat } from '@/features/home/hooks/use-moment-format';
import {
  HAPPENED_LIMIT,
  happenedRows,
  happenedStatus,
  type HappenedRow,
  type HappenedStatus,
} from '@/features/home/model/happened';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useNow } from '@/shared/hooks/use-now';

export type HappenedData = {
  visible: boolean;
  status: HappenedStatus;
  rows: readonly HappenedRow[];
  retry: () => void;
};

const MINUTE_MS = 60_000;

export function useHappened(): HappenedData {
  const { guard } = useCapabilities();
  const now = useNow(MINUTE_MS);
  const format = useMomentFormat();
  const feed = useEpisodeFeed(undefined, guard.view);
  const rows = happenedRows(feed.rows, {
    limit: HAPPENED_LIMIT,
    now,
    format,
    canReview: guard.review,
    pending: needsReview,
    titleOf: (episode) => episodeTitle(format.t, episode),
  });
  return {
    visible: guard.view,
    status: happenedStatus(rows.length, feed.status),
    rows,
    retry: () => void feed.reload(),
  };
}

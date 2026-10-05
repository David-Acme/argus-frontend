import { useCallback } from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { Panel } from '@/shared/components/ui/panel';
import type { InfiniteListState } from '@/shared/hooks/use-infinite-list';
import { cn } from '@/shared/libs/utils';
import { NotificationThreadRow } from '@/features/home/components/notification-thread-row';
import type { NotificationThread } from '@/features/home/model/notification-threads';

type RecentActivityCardProps = {
  title: string;
  emptyLabel: string;
  threads: readonly NotificationThread[];
  paging: InfiniteListState;
  fill: boolean;
  now: number;
  onRead: (thread: NotificationThread) => void;
};

const THREAD_ROW_ESTIMATE = 76;
const THREAD_LIST_MAX_HEIGHT = 480;

const threadKey = (thread: NotificationThread) => thread.key;

export function RecentActivityCard({
  title,
  emptyLabel,
  threads,
  paging,
  fill,
  now,
  onRead,
}: RecentActivityCardProps) {
  const renderThread = useCallback(
    (thread: NotificationThread) => (
      <NotificationThreadRow thread={thread} now={now} expandable onRead={onRead} />
    ),
    [now, onRead]
  );

  return (
    <Panel title={title} className={cn('gap-3', fill && 'min-h-80 flex-1 basis-0')}>
      {threads.length === 0 ? (
        <EmptyState variant="inline" icon="bell" title={emptyLabel} className="min-h-28 flex-1" />
      ) : (
        <View className={fill ? 'min-h-0 flex-1 basis-0' : undefined}>
          <InfiniteList
            data={threads}
            keyOf={threadKey}
            renderItem={renderThread}
            estimatedItemSize={THREAD_ROW_ESTIMATE}
            gap={4}
            paging={paging}
            maxHeight={fill ? undefined : THREAD_LIST_MAX_HEIGHT}
            scrollIndicator
          />
        </View>
      )}
    </Panel>
  );
}

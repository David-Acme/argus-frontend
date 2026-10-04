import { View } from 'react-native';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { NotificationThreadRow } from '@/features/home/components/notification-thread-row';
import type { NotificationThread } from '@/features/home/model/notification-threads';

type RecentActivityCardProps = {
  title: string;
  emptyLabel: string;
  threads: readonly NotificationThread[];
  now: number;
  onRead: (thread: NotificationThread) => void;
};

const RECENT_LIMIT = 6;

export function RecentActivityCard({
  title,
  emptyLabel,
  threads,
  now,
  onRead,
}: RecentActivityCardProps) {
  const recent = threads.slice(0, RECENT_LIMIT);

  return (
    <Panel title={title} className="flex-1 gap-3">
      {recent.length === 0 ? (
        <EmptyState variant="inline" icon="bell" title={emptyLabel} className="min-h-28 flex-1" />
      ) : (
        <View className="gap-1">
          {recent.map((thread) => (
            <NotificationThreadRow
              key={thread.key}
              thread={thread}
              now={now}
              expandable
              onRead={onRead}
            />
          ))}
        </View>
      )}
    </Panel>
  );
}

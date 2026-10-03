import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import type { NotificationPreview } from '@/features/home/components/notification-popover';
import { Panel } from '@/shared/components/ui/panel';
import { EmptyState } from '@/shared/components/ui/empty-state';

type RecentActivityCardProps = {
  title: string;
  emptyLabel: string;
  items: readonly NotificationPreview[];
};

const RECENT_LIMIT = 6;

export function RecentActivityCard({ title, emptyLabel, items }: RecentActivityCardProps) {
  const recent = items.slice(0, RECENT_LIMIT);

  return (
    <Panel title={title} className="flex-1 gap-4">
      {recent.length === 0 ? (
        <EmptyState variant="inline" icon="bell" title={emptyLabel} className="min-h-28 flex-1" />
      ) : (
        <View className="gap-4">
          {recent.map((item) => (
            <View key={item.id} className="flex-row items-start gap-3">
              <View className="bg-surface-secondary size-8 items-center justify-center rounded-xl">
                <Icon name="bell" className="text-foreground-secondary size-4" />
                <View
                  className={cn(
                    'border-card absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2',
                    item.isRead ? 'hidden' : 'bg-interactive'
                  )}
                />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text variant="label" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="caption" numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

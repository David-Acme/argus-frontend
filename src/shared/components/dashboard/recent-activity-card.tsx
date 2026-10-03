import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import type { NotificationPreview } from './notification-popover';

type RecentActivityCardProps = {
  title: string;
  emptyLabel: string;
  items: readonly NotificationPreview[];
};

const RECENT_LIMIT = 6;

export function RecentActivityCard({ title, emptyLabel, items }: RecentActivityCardProps) {
  const recent = items.slice(0, RECENT_LIMIT);

  return (
    <View className="bg-card flex-1 gap-4 rounded-[22px] p-4 shadow-md shadow-black/[0.06]">
      <Text className="text-body font-semibold">{title}</Text>
      {recent.length === 0 ? (
        <View className="min-h-28 flex-1 items-center justify-center gap-2">
          <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
            <Icon name="bell" className="text-muted-foreground size-5" />
          </View>
          <Text variant="caption" className="text-center">
            {emptyLabel}
          </Text>
        </View>
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
    </View>
  );
}

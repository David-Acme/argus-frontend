import { View } from 'react-native';
import type { ICameraEventCacheRow } from '@/core/interfaces';
import type { EventSeverity } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { cn } from '@/shared/libs/utils';
import { Panel } from '@/shared/components/ui/panel';

type RecentDetectionsProps = {
  title: string;
  emptyLabel: string;
  emptyHint: string;
  events: readonly ICameraEventCacheRow[];
  className?: string;
};

const SEVERITY_DOT: Record<EventSeverity, string> = {
  info: 'bg-border',
  warning: 'bg-warning',
  critical: 'bg-error',
};

export function RecentDetections({ title, emptyLabel, emptyHint, events, className }: RecentDetectionsProps) {
  const date = useDateFormatter();

  return (
    <Panel title={title} className={className}>
      {events.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2 py-6">
          <View className="bg-surface-secondary size-10 items-center justify-center rounded-full">
            <Icon name="activity" className="text-muted-foreground size-5" />
          </View>
          <Text variant="label" className="text-center">
            {emptyLabel}
          </Text>
          <Text variant="caption" className="text-center">
            {emptyHint}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {events.map((event) => (
            <View key={event.id} className="flex-row gap-2.5">
              <View className={cn('mt-1.5 size-2 shrink-0 rounded-full', SEVERITY_DOT[event.severity])} />
              <View className="min-w-0 flex-1">
                <Text className="text-caption font-medium" numberOfLines={2}>
                  {event.summary}
                </Text>
                <Text variant="micro">
                  {date.formatDayMonth(new Date(event.occurredAt))} {date.formatTime(new Date(event.occurredAt))}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Panel>
  );
}

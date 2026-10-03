import { Pressable, View } from 'react-native';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

export type UpcomingTaskItem = {
  id: string;
  title: string;
  due: string;
  overdue: boolean;
};

type UpcomingTasksPanelProps = {
  title: string;
  emptyLabel: string;
  hint: string;
  overdueLabel: string;
  items: readonly UpcomingTaskItem[];
  onSelect: (id: string) => void;
};

export function UpcomingTasksPanel({
  title,
  emptyLabel,
  hint,
  overdueLabel,
  items,
  onSelect,
}: UpcomingTasksPanelProps) {
  return (
    <Panel title={title} count={items.length} className="min-h-56 flex-1">
      {items.length === 0 ? (
        <EmptyState variant="panel" icon="calendar" title={emptyLabel} hint={hint} />
      ) : (
        <View className="-mx-1.5 gap-0.5">
          {items.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={
                item.overdue
                  ? `${item.title}, ${overdueLabel}, ${item.due}`
                  : `${item.title}, ${item.due}`
              }
              onPress={() => onSelect(item.id)}
              className="active:bg-surface-secondary web:hover:bg-surface-secondary/60 min-h-11 flex-row items-center gap-3 rounded-2xl px-2.5 py-2">
              <View
                className={cn('size-2 rounded-full', item.overdue ? 'bg-error' : 'bg-accent')}
              />
              <Text variant="body" className="min-w-0 flex-1" numberOfLines={1}>
                {item.title}
              </Text>
              <Text
                variant="caption"
                className={cn('tabular-nums', item.overdue && 'text-error-strong font-medium')}>
                {item.due}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </Panel>
  );
}

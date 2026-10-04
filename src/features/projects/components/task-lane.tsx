import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { Panel } from '@/shared/components/ui/panel';

type TaskLaneProps = {
  label: string;
  count: number;
  toneClassName: string;
  emptyLabel: string;
  addLabel: string;
  onAdd?: () => void;
  children: ReactNode;
};

export function TaskLane({
  label,
  count,
  toneClassName,
  emptyLabel,
  addLabel,
  onAdd,
  children,
}: TaskLaneProps) {
  const empty = count === 0;

  return (
    <Panel className="flex-1 gap-3">
      <View className="flex-row items-center gap-2">
        <View className={cn('size-2 rounded-full', toneClassName)} />
        <Text variant="label" className="flex-1 font-semibold" numberOfLines={1}>
          {label}
        </Text>
        <View className="bg-surface-secondary min-w-6 items-center rounded-full px-2 py-0.5">
          <Text variant="micro" className="text-foreground-secondary tabular-nums">
            {String(count)}
          </Text>
        </View>
      </View>
      {empty ? null : <View className="gap-2">{children}</View>}
      {onAdd ? (
        <CreateTile label={addLabel} onPress={onAdd} layout={empty ? 'fill' : 'row'} />
      ) : empty ? (
        <View className="border-border-subtle min-h-[140px] flex-1 items-center justify-center rounded-xl border-2 border-dashed px-4 py-6">
          <Text variant="caption">{emptyLabel}</Text>
        </View>
      ) : null}
    </Panel>
  );
}

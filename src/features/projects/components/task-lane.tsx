import type { ReactElement } from 'react';
import { View } from 'react-native';
import type { IProjectTaskCacheRow } from '@/core/interfaces';
import { CreateTile } from '@/shared/components/ui/create-tile';
import { InfiniteList } from '@/shared/components/ui/infinite-list';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { useTaskLaneFill } from '@/features/projects/components/task-board';

type TaskLaneProps = {
  label: string;
  toneClassName: string;
  emptyLabel: string;
  addLabel: string;
  tasks: readonly IProjectTaskCacheRow[];
  renderTask: (task: IProjectTaskCacheRow) => ReactElement;
  onAdd?: () => void;
};

const TASK_ROW_ESTIMATE = 76;
const TASK_ROW_GAP = 8;
const LANE_LIST_MAX_HEIGHT = 520;

const taskKey = (task: IProjectTaskCacheRow) => task.id;

export function TaskLane({
  label,
  toneClassName,
  emptyLabel,
  addLabel,
  tasks,
  renderTask,
  onAdd,
}: TaskLaneProps) {
  const fill = useTaskLaneFill();
  const empty = tasks.length === 0;

  return (
    <Panel className="flex-1 gap-3">
      <View className="flex-row items-center gap-2">
        <View className={cn('size-2 rounded-full', toneClassName)} />
        <Text variant="label" className="flex-1 font-semibold" numberOfLines={1}>
          {label}
        </Text>
        <View className="bg-surface-secondary min-w-6 items-center rounded-full px-2 py-0.5">
          <Text variant="micro" className="text-foreground-secondary tabular-nums">
            {String(tasks.length)}
          </Text>
        </View>
      </View>
      {empty ? null : (
        <View className={fill ? 'min-h-0 flex-1 basis-0' : undefined}>
          <InfiniteList
            data={tasks}
            keyOf={taskKey}
            renderItem={renderTask}
            estimatedItemSize={TASK_ROW_ESTIMATE}
            gap={TASK_ROW_GAP}
            maxHeight={fill ? undefined : LANE_LIST_MAX_HEIGHT}
            scrollIndicator
          />
        </View>
      )}
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

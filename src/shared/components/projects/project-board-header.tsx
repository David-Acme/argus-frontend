import { View } from 'react-native';
import type { ProjectStatus } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { PROJECT_STATUS_TONE } from './project-card-row';
import { Panel } from '@/shared/components/ui/panel';

type ProjectBoardHeaderProps = {
  name: string;
  description: string;
  status: ProjectStatus;
  statusLabel: string;
  countLabel: string;
  percentLabel: string;
  progress: number;
  editLabel: string;
  newTaskLabel: string;
  onEdit?: () => void;
  onNewTask?: () => void;
};

export function ProjectBoardHeader({
  name,
  description,
  status,
  statusLabel,
  countLabel,
  percentLabel,
  progress,
  editLabel,
  newTaskLabel,
  onEdit,
  onNewTask,
}: ProjectBoardHeaderProps) {
  const ratio = Math.max(0, Math.min(1, progress));

  return (
    <Panel className="gap-4 p-5">
      <View className="flex-row flex-wrap items-start gap-3">
        <View className="min-w-[200px] flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <View className={cn('size-2 rounded-full', PROJECT_STATUS_TONE[status])} />
            <Text variant="micro" className="text-foreground-secondary">
              {statusLabel}
            </Text>
          </View>
          <Text variant="headline" numberOfLines={2}>
            {name}
          </Text>
          {description ? (
            <Text variant="caption" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        {onEdit || onNewTask ? (
          <View className="flex-row items-center gap-2">
            {onEdit ? (
              <Button variant="ghost" size="icon" accessibilityLabel={editLabel} onPress={onEdit}>
                <Icon name="square-pen" className="text-muted-foreground size-4" />
              </Button>
            ) : null}
            {onNewTask ? (
              <Button size="sm" onPress={onNewTask}>
                <Icon name="plus" className="text-foreground-on-interactive size-4" />
                <Text>{newTaskLabel}</Text>
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="label" className="tabular-nums">
            {countLabel}
          </Text>
          <Text variant="micro" className="tabular-nums">
            {percentLabel}
          </Text>
        </View>
        <View className="bg-border-subtle h-1.5 overflow-hidden rounded-full">
          <View
            className="bg-interactive h-full rounded-full"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </View>
      </View>
    </Panel>
  );
}

import { Pressable, View } from 'react-native';
import type { MenuOption, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { TaskPriorityMark } from './task-priority-mark';

type TaskRowProps = {
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  priorityLabel: string;
  due?: string;
  statusTag?: string;
  statusOptions: readonly MenuOption<ProjectTaskStatus>[];
  statusMenuTitle: string;
  closeLabel: string;
  onChangeStatus: (status: ProjectTaskStatus) => void;
  onPress?: () => void;
};

const STATUS_ICON: Record<ProjectTaskStatus, 'check-circle' | 'clock' | 'list-todo' | 'x'> = {
  backlog: 'list-todo',
  todo: 'list-todo',
  doing: 'clock',
  done: 'check-circle',
  canceled: 'x',
};

export function TaskRow({
  title,
  status,
  priority,
  priorityLabel,
  due,
  statusTag,
  statusOptions,
  statusMenuTitle,
  closeLabel,
  onChangeStatus,
  onPress,
}: TaskRowProps) {
  const finished = status === 'done' || status === 'canceled';

  return (
    <View className="bg-surface-secondary min-h-11 flex-row items-center gap-3 rounded-[14px] px-3 py-2 web:hover:bg-card-secondary">
      <AdaptiveMenu
        options={statusOptions}
        selected={status}
        onSelect={onChangeStatus}
        title={statusMenuTitle}
        closeLabel={closeLabel}
        trigger={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={statusMenuTitle}
            className="size-6 items-center justify-center active:opacity-60">
            <Icon
              name={STATUS_ICON[status]}
              className={cn('size-[18px]', finished ? 'text-success' : 'text-muted-foreground')}
            />
          </Pressable>
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        className="flex-1 active:opacity-70"
        onPress={onPress}>
        <Text
          className={cn(
            'text-sm',
            finished ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
          numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
      {statusTag ? (
        <View className="bg-card rounded-full px-2 py-0.5">
          <Text variant="micro">{statusTag}</Text>
        </View>
      ) : null}
      {due ? <Text variant="micro">{due}</Text> : null}
      <TaskPriorityMark priority={priority} label={priorityLabel} />
    </View>
  );
}

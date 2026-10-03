import { Pressable, View } from 'react-native';
import type { MenuOption, ProjectTaskPriority, ProjectTaskStatus } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';
import { TaskPriorityMark } from '@/features/projects/components/task-priority-mark';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { useTaskPressGuard } from '@/features/projects/components/task-drag';

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
  pending?: boolean;
  overdue?: boolean;
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
  pending = false,
  overdue = false,
}: TaskRowProps) {
  const finished = status === 'done' || status === 'canceled';
  const guardPress = useTaskPressGuard();

  return (
    <View
      accessibilityState={{ busy: pending }}
      className={cn(
        'bg-surface-secondary web:hover:bg-card-secondary min-h-11 flex-row items-center gap-3 rounded-[14px] px-3 py-2 web:select-none',
        pending && 'opacity-60',
      )}>
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
            disabled={pending}
            hitSlop={10}
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
        disabled={pending}
        onPress={() => guardPress(onPress)}>
        <Text
          variant="body"
          className={cn(
            finished ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
          numberOfLines={1}>
          {title}
        </Text>
      </Pressable>
      {statusTag ? (
        <StatusBadge label={statusTag} surface="card" className="self-center" />
      ) : null}
      {due ? (
        <Text variant="micro" className={overdue && !finished ? 'text-error-strong font-medium' : undefined}>
          {due}
        </Text>
      ) : null}
      <TaskPriorityMark priority={priority} label={priorityLabel} />
    </View>
  );
}

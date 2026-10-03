import { View } from 'react-native';
import type { ProjectTaskPriority } from '@/core/types';
import { cn } from '@/shared/libs/utils';

type TaskPriorityMarkProps = {
  priority: ProjectTaskPriority;
  label: string;
};

const FILLED: Record<ProjectTaskPriority, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  urgent: 3,
};

export function TaskPriorityMark({ priority, label }: TaskPriorityMarkProps) {
  const filled = FILLED[priority];

  return (
    <View
      className="h-3.5 flex-row items-end gap-[2px]"
      accessibilityRole="text"
      accessibilityLabel={label}>
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={{ height: 5 + index * 4 }}
          className={cn(
            'w-[3px] rounded-full',
            index < filled
              ? priority === 'urgent'
                ? 'bg-error'
                : 'bg-foreground-secondary'
              : 'bg-border'
          )}
        />
      ))}
    </View>
  );
}

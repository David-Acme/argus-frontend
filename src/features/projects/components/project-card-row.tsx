import { Pressable, View } from 'react-native';
import type { ProjectStatus } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type ProjectCardRowProps = {
  name: string;
  description: string;
  status: ProjectStatus;
  statusLabel: string;
  taskCount: string;
  progress: number;
  selected?: boolean;
  onPress?: () => void;
};

export const PROJECT_STATUS_TONE: Record<ProjectStatus, string> = {
  planned: 'bg-border',
  active: 'bg-success',
  paused: 'bg-warning',
  done: 'bg-interactive',
  canceled: 'bg-muted-foreground',
};

export function ProjectCardRow({
  name,
  description,
  status,
  statusLabel,
  taskCount,
  progress,
  selected,
  onPress,
}: ProjectCardRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${statusLabel}`}
      className={cn(
        'bg-card gap-2 rounded-2xl p-3 shadow-md shadow-black/[0.05] active:opacity-80',
        selected && 'border-accent border'
      )}
      onPress={onPress}>
      <View className="flex-row items-center gap-2">
        <View className={cn('size-2 rounded-full', PROJECT_STATUS_TONE[status])} />
        <Text className="flex-1 text-body font-semibold" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="micro">{taskCount}</Text>
      </View>
      {description ? (
        <Text variant="caption" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className="bg-border-subtle h-[4px] overflow-hidden rounded-full">
        <View
          className="bg-interactive h-full rounded-full"
          style={{ width: `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%` }}
        />
      </View>
    </Pressable>
  );
}

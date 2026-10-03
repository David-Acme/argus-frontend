import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type ProjectCardProps = {
  title: string;
  description: string;
  done: number;
  total: number;
  progressLabel: string;
  tasksLabel: string;
  onPress?: () => void;
  className?: string;
};

export function ProjectCard({
  title,
  description,
  done,
  total,
  progressLabel,
  tasksLabel,
  onPress,
  className,
}: ProjectCardProps) {
  const progress = total > 0 ? done / total : 0;
  const progressValue = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  useEffect(() => {
    progressValue.value = withTiming(progress, { duration: 720 });
  }, [progress, progressValue]);

  return (
    <View className={cn('min-w-0', className)}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${description}`}
        className="active:opacity-80"
        onPress={onPress}>
        <View className="bg-card overflow-hidden rounded-3xl p-3 shadow-md shadow-black/[0.06]">
          <View className="bg-surface-secondary h-[104px] justify-between rounded-[18px] p-3">
            <View className="bg-card size-8 items-center justify-center rounded-full">
              <Icon name="list-todo" className="text-foreground-secondary size-4" />
            </View>
            <View>
              <Text variant="title">
                {done}
                <Text variant="body" className="text-foreground-secondary">
                  {` / ${total}`}
                </Text>
              </Text>
              <Text variant="micro">{tasksLabel}</Text>
            </View>
          </View>
          <Text variant="body" className="mt-3 font-semibold" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" className="mt-0.5" numberOfLines={2}>
            {description}
          </Text>
          <View className="mt-3 flex-row items-center gap-2">
            <View className="bg-border-subtle h-[5px] flex-1 overflow-hidden rounded-full">
              <Animated.View className="bg-interactive h-full rounded-full" style={progressStyle} />
            </View>
            <Text variant="micro">{progressLabel}</Text>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

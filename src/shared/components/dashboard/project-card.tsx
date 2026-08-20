import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { IconName, ProjectVisual } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { TREND_POINTS } from '@/shared/constants';
import { itemIn } from '@/shared/libs/animations';
import { TileChart } from './tile-chart';
import { TrendChart } from './trend-chart';

type ProjectCardProps = {
  title: string;
  description: string;
  /** Trailing label next to the progress bar, e.g. "30%". */
  meta: string;
  /** 0..1 */
  progress: number;
  visual: ProjectVisual;
  /** Leading icon of the tiles visual. */
  icon: IconName;
  onPress?: () => void;
};

export function ProjectCard({
  title,
  description,
  meta,
  progress,
  visual,
  icon,
  onPress,
}: ProjectCardProps) {
  const progressValue = useSharedValue(0);
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  useEffect(() => {
    progressValue.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 720 });
  }, [progress, progressValue]);

  return (
    <Animated.View entering={itemIn.delay(120).duration(360)} className="w-[196px]">
      <Pressable accessibilityRole="button" className="active:opacity-80" onPress={onPress}>
        <View className="bg-card overflow-hidden rounded-[24px] p-3 shadow-md shadow-black/[0.06]">
          <View className="bg-surface-secondary overflow-hidden rounded-[18px]">
            {visual === 'chart' ? (
              <TrendChart points={TREND_POINTS} emphasis={1} />
            ) : (
              <TileChart icons={[icon, 'bell']} />
            )}
          </View>
          <Text className="mt-3 text-[15px] font-semibold" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-muted-foreground mt-1 text-[12px] leading-[17px]" numberOfLines={2}>
            {description}
          </Text>
          <View className="mt-3 flex-row items-center gap-2">
            <View className="bg-border-subtle h-[5px] flex-1 overflow-hidden rounded-full">
              <Animated.View className="bg-interactive h-full rounded-full" style={progressStyle} />
            </View>
            <Text className="text-muted-foreground text-[11px] font-medium">{meta}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

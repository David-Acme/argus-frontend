import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useUniwind } from 'uniwind';
import type { TrendPoint } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { PROJECT_PANEL_HEIGHT, colorTokens } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type TrendChartProps = {
  points: readonly TrendPoint[];
  /** Index of the column drawn solid; the rest stay light. */
  emphasis?: number;
};

/**
 * Period totals as bars with the rate drawn over them. The bars need a parent
 * with a definite height or their percentage heights never resolve, hence the
 * explicit `h-full` on the row and each column.
 */
export function TrendChart({ points, emphasis = 1 }: TrendChartProps) {
  const { theme } = useUniwind();
  const palette = colorTokens[theme === 'dark' ? 'dark' : 'light'];
  const step = 100 / points.length;
  const linePoints = points
    .map((point, index) => {
      const x = step * index + step / 2;
      const y = 100 - Math.max(0, Math.min(100, point.line));
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View className="px-3 pb-2 pt-5" style={{ height: PROJECT_PANEL_HEIGHT + 28 }}>
      <View className="relative flex-1">
        <View className="absolute inset-0 h-full flex-row items-stretch justify-between gap-2">
          {points.map((point, index) => (
            <View key={point.label} className="h-full flex-1 items-center justify-end">
              <Text
                className={cn(
                  'mb-1 text-[10px] font-semibold',
                  index === emphasis ? 'text-foreground' : 'text-foreground-secondary'
                )}>
                {point.label}
              </Text>
              <Animated.View
                entering={FadeIn.delay(120 + index * 90).duration(320)}
                className={cn(
                  'w-full rounded-t-[10px]',
                  index === emphasis ? 'bg-interactive' : 'bg-border'
                )}
                style={{ height: `${Math.max(8, Math.min(100, point.bar))}%` }}
              />
            </View>
          ))}
        </View>
        {/* Wrapped instead of styling <Svg>: className on react-native-svg
            elements is not guaranteed to be transformed. */}
        <View className="absolute inset-0" pointerEvents="none">
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Polyline
              points={linePoints}
              fill="none"
              stroke={palette.warning}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((point, index) =>
              index === 0 || index === points.length - 1 ? (
                <Circle
                  key={point.label}
                  cx={step * index + step / 2}
                  cy={100 - Math.max(0, Math.min(100, point.line))}
                  r={3}
                  fill={palette.warning}
                />
              ) : null
            )}
          </Svg>
        </View>
      </View>
    </View>
  );
}

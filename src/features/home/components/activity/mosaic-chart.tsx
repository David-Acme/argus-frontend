import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MOSAIC_COLUMNS, MOSAIC_ROWS, MOSAIC_TINTS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type MosaicChartProps = {
  levels: readonly (readonly number[])[];
  delay?: number;
};

export function MosaicChart({ levels, delay = 120 }: MosaicChartProps) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(320)} className="gap-[3px]">
      {Array.from({ length: MOSAIC_ROWS }, (_, row) => (
        <View key={row} className="flex-row gap-[3px]">
          {Array.from({ length: MOSAIC_COLUMNS }, (_, column) => (
            <View key={column} className={cn('size-2 rounded-xs', MOSAIC_TINTS[levels[row]?.[column] ?? 0])} />
          ))}
        </View>
      ))}
    </Animated.View>
  );
}

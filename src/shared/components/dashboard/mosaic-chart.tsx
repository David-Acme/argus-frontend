import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MOSAIC_COLUMNS, MOSAIC_ROWS, MOSAIC_TINTS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type MosaicChartProps = {
  /** Milliseconds before the first cell fades in. */
  delay?: number;
  /**
   * Density per cell (0..3), rows of time-of-day over days. Without it the
   * block falls back to its own shape, which is only decoration.
   */
  levels?: readonly (readonly number[])[];
};

/**
 * Density rises toward the bottom-right so the block reads as "activity built
 * up over time" instead of noise. Deterministic: same shape every render.
 */
function levelAt(row: number, column: number): number {
  const bias = (row / (MOSAIC_ROWS - 1)) * 0.62 + (column / (MOSAIC_COLUMNS - 1)) * 0.38;
  const jitter = ((row * 7 + column * 13) % 11) / 11;
  const value = bias * 0.78 + jitter * 0.42;
  if (value > 0.86) return 3;
  if (value > 0.62) return 2;
  if (value > 0.38) return 1;
  return 0;
}

export function MosaicChart({ delay = 120, levels }: MosaicChartProps) {
  return (
    <View className="gap-[3px]">
      {Array.from({ length: MOSAIC_ROWS }, (_, row) => (
        <View key={row} className="flex-row gap-[3px]">
          {Array.from({ length: MOSAIC_COLUMNS }, (_, column) => (
            <Animated.View
              key={column}
              entering={FadeIn.delay(delay + (row * MOSAIC_COLUMNS + column) * 6).duration(240)}
              className={cn(
                'size-2 rounded-[2px]',
                MOSAIC_TINTS[levels?.[row]?.[column] ?? levelAt(row, column)]
              )}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

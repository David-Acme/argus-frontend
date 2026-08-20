import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { PROJECT_PANEL_HEIGHT } from '@/shared/constants';

type TileChartProps = {
  icons: readonly IconName[];
};

/** Two raised tiles: the "collection" counterpart to the trend card. */
export function TileChart({ icons }: TileChartProps) {
  return (
    <View
      className="flex-row items-center justify-center gap-3 px-3"
      style={{ height: PROJECT_PANEL_HEIGHT + 28 }}>
      {icons.map((icon, index) => (
        <Animated.View
          key={icon}
          entering={FadeIn.delay(140 + index * 90).duration(320)}
          className="bg-card size-14 items-center justify-center rounded-[18px] shadow-md shadow-black/10">
          <Icon name={icon} className="text-foreground-secondary size-6" />
        </Animated.View>
      ))}
    </View>
  );
}

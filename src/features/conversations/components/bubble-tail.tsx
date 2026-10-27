import { View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { size, useThemeTokens } from '@/shared/theme';
import type { ColorRole } from '@/shared/theme';

export type BubbleTailProps = { side: 'start' | 'end'; fill: ColorRole };

const TAIL = size.bubbleTail;

const END = `M0 0H${TAIL}L0 ${TAIL}Z`;

const START = `M${TAIL} 0H0L${TAIL} ${TAIL}Z`;

const PLACE = {
  end: { position: 'absolute', top: 0, right: -TAIL },
  start: { position: 'absolute', top: 0, left: -TAIL },
} as const;

export function BubbleTail({ side, fill }: BubbleTailProps) {
  const { color } = useThemeTokens();
  return (
    <View pointerEvents="none" style={PLACE[side]}>
      <Svg width={TAIL} height={TAIL} aria-hidden>
        <Path d={side === 'end' ? END : START} fill={color[fill]} />
      </Svg>
    </View>
  );
}

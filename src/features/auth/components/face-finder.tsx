import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Path, Svg } from 'react-native-svg';
import { useThemeTokens } from '@/shared/theme';
import { Icon } from '@/shared/ui/icon';
import { FINDER_LENS, FINDER_RING } from '@/features/auth/constants/face.constant';
import { useTickSweep } from '@/features/auth/hooks/use-tick-sweep';
import { litTicks } from '@/features/auth/model/face-progress';
import { tickPath } from '@/features/auth/model/face-finder';

export type FaceFinderProps = {
  size: number;
  progress: number;
  label: string;
  done?: boolean;
  children?: ReactNode;
};

export function FaceFinder({ size, progress, label, done = false, children }: FaceFinderProps) {
  const { color } = useThemeTokens();
  const lit = useTickSweep(litTicks(progress));
  const frame = { width: size, height: size };
  const lens = { width: size * FINDER_LENS, height: size * FINDER_LENS };
  const base = tickPath({ size, inner: FINDER_RING.inner, outer: FINDER_RING.outerOff });
  const on = tickPath({ size, inner: FINDER_RING.inner, outer: FINDER_RING.outerOn, count: lit });
  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="items-center justify-center"
      style={frame}>
      <View className="absolute inset-0" aria-hidden>
        <Svg width={size} height={size}>
          <Path
            d={base}
            stroke={color['fill-press']}
            strokeWidth={size * FINDER_RING.widthOff}
            strokeLinecap="round"
          />
          {lit > 0 ? (
            <Path
              d={on}
              stroke={color.ok}
              strokeWidth={size * FINDER_RING.widthOn}
              strokeLinecap="round"
            />
          ) : null}
        </Svg>
      </View>
      <View
        className="bg-fill items-center justify-center overflow-hidden rounded-full"
        style={lens}>
        {children ?? <Icon name="face" size="large" tone="text-3" />}
      </View>
      {done ? (
        <View className="absolute inset-0 items-center justify-center">
          <View className="size-finder-done bg-ok items-center justify-center rounded-full">
            <Icon name="check" size="large" tone="on-media" />
          </View>
        </View>
      ) : null}
    </View>
  );
}

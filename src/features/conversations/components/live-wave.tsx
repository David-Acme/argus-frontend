import { Canvas, Path, usePathValue, type SkPathBuilder } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { size, useEffects, useThemeTokens } from '@/shared/theme';
import {
  easeToward,
  liveBarCount,
  liveBarHeight,
  liveBarX,
  scrollShare,
} from '@/features/conversations/model/live-wave';
import type { LiveLevels, WaveBox } from '@/features/conversations/model/live-wave';
import { RECORDER_TICK_MS } from '@/features/conversations/model/voice-note';

export type LiveWaveProps = { live: SharedValue<LiveLevels> };

const CAP = size.liveBar / 2;

type BarsDraw = {
  builder: SkPathBuilder;
  box: WaveBox;
  values: readonly number[];
  share: number;
  newest: number;
};

function drawBars({ builder, box, values, share, newest }: BarsDraw) {
  'worklet';
  const count = Math.min(values.length, liveBarCount(box));
  for (let fromEnd = 0; fromEnd < count; fromEnd++) {
    const level = fromEnd === 0 ? newest : (values[values.length - 1 - fromEnd] ?? 0);
    const x = liveBarX(box, fromEnd, share) + CAP;
    const height = liveBarHeight(box, level);
    const top = (box.height - height) / 2 + CAP;
    builder.moveTo(x, top);
    builder.lineTo(x, Math.max(top, top + height - size.liveBar));
  }
}

export function LiveWave({ live }: LiveWaveProps) {
  const { reduceMotion } = useEffects();
  const { color } = useThemeTokens();
  const [width, setWidth] = useState(0);
  const seq = useSharedValue(-1);
  const landedAt = useSharedValue(0);
  const share = useSharedValue(0);
  const newest = useSharedValue(0);
  const box: WaveBox = { width, height: size.noteWave, pitch: size.livePitch };

  const frame = useFrameCallback((info) => {
    'worklet';
    const current = live.get();
    if (current.seq !== seq.get()) {
      seq.set(current.seq);
      landedAt.set(info.timestamp);
    }
    share.set(scrollShare(info.timestamp - landedAt.get(), RECORDER_TICK_MS));
    const target = current.values[current.values.length - 1] ?? 0;
    newest.set(easeToward(newest.get(), target, info.timeSincePreviousFrame ?? 0));
  }, false);

  useEffect(() => {
    frame.setActive(!reduceMotion && width > 0);
  }, [frame, reduceMotion, width]);

  const path = usePathValue((builder) => {
    'worklet';
    if (box.width <= 0) return;
    if (reduceMotion) {
      builder.moveTo(0, box.height / 2);
      builder.lineTo(box.width, box.height / 2);
      return;
    }
    drawBars({ builder, box, values: live.get().values, share: share.get(), newest: newest.get() });
  });

  const canvas = { width, height: size.noteWave };
  const measure = (event: LayoutChangeEvent) =>
    setWidth(Math.round(event.nativeEvent.layout.width));

  return (
    <View aria-hidden onLayout={measure} className="h-note-wave min-w-0 flex-1">
      {width > 0 ? (
        <Canvas style={canvas} pointerEvents="none">
          <Path
            path={path}
            style="stroke"
            strokeWidth={size.liveBar}
            strokeCap="round"
            color={reduceMotion ? color['text-3'] : color.accent}
          />
        </Canvas>
      ) : null}
    </View>
  );
}

import { useEffect, useRef, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { size, useEffects, useThemeTokens } from '@/shared/theme';
import type { LiveLevels } from '@/features/conversations/model/live-wave';
import { paintWave } from '@/features/conversations/services/wave-painter';

export type LiveWaveProps = { live: SharedValue<LiveLevels> };

const RATIO_CAP = 2;

export function LiveWave({ live }: LiveWaveProps) {
  const { reduceMotion } = useEffects();
  const { color } = useThemeTokens();
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLCanvasElement | null>(null);
  const ratio = Math.min(RATIO_CAP, globalThis.devicePixelRatio ?? 1);
  const tint = reduceMotion ? color['text-3'] : color.accent;

  useEffect(() => {
    const context = ref.current?.getContext('2d');
    if (!context || width <= 0) return;
    return paintWave({
      context,
      box: { width, height: size.noteWave, pitch: size.livePitch },
      ratio,
      tint,
      still: reduceMotion,
      live,
    });
  }, [live, width, ratio, tint, reduceMotion]);

  const measure = (event: LayoutChangeEvent) =>
    setWidth(Math.round(event.nativeEvent.layout.width));
  const box = { width, height: size.noteWave };

  return (
    <View aria-hidden onLayout={measure} className="h-note-wave min-w-0 flex-1">
      {width > 0 ? (
        <canvas ref={ref} width={width * ratio} height={size.noteWave * ratio} style={box} />
      ) : null}
    </View>
  );
}

import { useEffect, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { motion, size } from '@/shared/theme';
import { Text } from '@/shared/ui/text';
import { formatPlayerTime, fractionOf, scrubTime, type SeekSide } from './player-model';
import type { PlayerTimes } from './use-player';

export type ScrubberCopy = { label: string; value: string };

export type PlayerScrubberProps = {
  times: PlayerTimes;
  copy: ScrubberCopy;
  onScrubbing: (scrubbing: boolean) => void;
  onSeek: (positionMs: number) => void;
  onStep: (side: SeekSide) => void;
};

const SAMPLE_MS = 250;

const THUMB_GROWTH = size.scrubThumbActive / size.scrubThumb;

const widthOf = (fraction: number) => ({
  width: `${Math.min(1, Math.max(0, fraction)) * 100}%` as const,
});

const ACTIONS = [{ name: 'increment' as const }, { name: 'decrement' as const }];

function useProgress(times: PlayerTimes) {
  const played = useSharedValue(fractionOf(times.positionMs, times.durationMs));
  const buffered = fractionOf(times.bufferedMs, times.durationMs);
  useEffect(() => {
    played.set(
      withTiming(fractionOf(times.positionMs, times.durationMs), {
        duration: SAMPLE_MS,
        easing: Easing.linear,
      })
    );
  }, [played, times.durationMs, times.positionMs]);
  return { played, buffered };
}

export function PlayerScrubber({ times, copy, onScrubbing, onSeek, onStep }: PlayerScrubberProps) {
  const [width, setWidth] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const { played, buffered } = useProgress(times);
  const drag = useSharedValue(-1);
  const measure = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  const timeAt = (x: number) => scrubTime({ x, width, durationMs: times.durationMs });
  const begin = () => onScrubbing(true);
  const move = (x: number) => setPreview(timeAt(x));
  const finish = (x: number) => {
    onSeek(timeAt(x));
    setPreview(null);
    onScrubbing(false);
  };
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((event) => {
      drag.set(event.x);
      scheduleOnRN(begin);
      scheduleOnRN(move, event.x);
    })
    .onUpdate((event) => {
      drag.set(event.x);
      scheduleOnRN(move, event.x);
    })
    .onFinalize((event) => {
      drag.set(-1);
      scheduleOnRN(finish, event.x);
    });
  const fill = useAnimatedStyle(() => {
    const at = drag.get() >= 0 && width > 0 ? drag.get() / width : played.get();
    const shown = Math.min(1, Math.max(0, at));
    return { transform: [{ translateX: ((shown - 1) * width) / 2 }, { scaleX: shown }] };
  });
  const thumb = useAnimatedStyle(() => {
    const dragging = drag.get() >= 0;
    const at = dragging && width > 0 ? drag.get() / width : played.get();
    const grown = withTiming(dragging ? THUMB_GROWTH : 1, { duration: motion.duration.fast });
    return {
      transform: [
        { translateX: Math.min(1, Math.max(0, at)) * width - size.scrubThumb / 2 },
        { scale: grown },
      ],
    };
  });
  return (
    <GestureDetector gesture={pan}>
      <View
        accessible
        role="slider"
        aria-label={copy.label}
        aria-valuetext={copy.value}
        accessibilityActions={ACTIONS}
        onAccessibilityAction={(event) =>
          onStep(event.nativeEvent.actionName === 'increment' ? 'forward' : 'back')
        }
        onLayout={measure}
        className="h-scrub-target justify-center">
        <View className="h-scrub-track bg-on-media/30 overflow-hidden rounded-full">
          <View
            className="bg-on-media/50 absolute top-0 bottom-0 left-0"
            style={widthOf(buffered)}
          />
          <Animated.View className="bg-accent absolute inset-0" style={fill} />
        </View>
        <Animated.View
          className="bg-accent size-scrub-thumb absolute left-0 rounded-full"
          style={thumb}
        />
        {preview !== null ? (
          <View className="bg-scrim absolute bottom-full self-center rounded-sm px-2 py-1">
            <Text variant="mediaLabel" tone="on-media">
              {formatPlayerTime(preview)}
            </Text>
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

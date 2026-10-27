import { clsx } from 'clsx';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from 'react-native-reanimated';
import { size, useEffects } from '@/shared/theme';
import { playedShare } from '@/features/conversations/model/live-wave';
import { progressOf } from '@/features/conversations/model/voice-note';

export type NoteWaveProps = {
  peaks: readonly number[];
  positionMs: number;
  durationMs: number;
  playing: boolean;
  speed: number;
};

type BarsProps = { peaks: readonly number[]; tone: string };

type Report = { position: number; stamp: number };

const MIN_BAR = 0.12;

export const NOTE_WAVE_WIDTH = size.noteWidth - size.target - size.mediaControl;

const WAVE = { width: NOTE_WAVE_WIDTH, height: size.noteWave } as const;

const barStyle = (peak: number) => ({
  width: size.noteBar,
  height: Math.max(MIN_BAR, peak / 100) * size.noteWave,
});

function Bars({ peaks, tone }: BarsProps) {
  return (
    <View style={WAVE} className="flex-row items-center justify-between">
      {peaks.map((peak, index) => (
        <View key={index} style={barStyle(peak)} className={clsx('rounded-full', tone)} />
      ))}
    </View>
  );
}

export function NoteWave({ peaks, positionMs, durationMs, playing, speed }: NoteWaveProps) {
  const { reduceMotion } = useEffects();
  const report = useSharedValue<Report>({ position: positionMs, stamp: -1 });
  const share = useSharedValue(progressOf(positionMs, durationMs));
  const running = playing && !reduceMotion;

  const frame = useFrameCallback((info) => {
    'worklet';
    const last = report.get();
    if (last.stamp < 0) report.set({ position: last.position, stamp: info.timestamp });
    const since = last.stamp < 0 ? 0 : info.timestamp - last.stamp;
    share.set(playedShare(last.position, since, speed, durationMs));
  }, false);

  useEffect(() => {
    report.set({ position: positionMs, stamp: -1 });
    if (!running) share.set(progressOf(positionMs, durationMs));
  }, [report, share, positionMs, durationMs, running]);

  useEffect(() => {
    frame.setActive(running);
  }, [frame, running]);

  const clip = useAnimatedStyle(() => ({
    transform: [{ translateX: (share.get() - 1) * NOTE_WAVE_WIDTH }],
  }));
  const keep = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - share.get()) * NOTE_WAVE_WIDTH }],
  }));

  return (
    <View aria-hidden style={WAVE} className="overflow-hidden">
      <Bars peaks={peaks} tone="bg-text-3" />
      <Animated.View style={clip} className="absolute inset-0 overflow-hidden">
        <Animated.View style={keep}>
          <Bars peaks={peaks} tone="bg-accent" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

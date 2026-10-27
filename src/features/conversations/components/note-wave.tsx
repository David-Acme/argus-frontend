import { clsx } from 'clsx';
import { View } from 'react-native';
import { size } from '@/shared/theme';

export type NoteWaveProps = { peaks: readonly number[]; progress: number };

const MIN_BAR = 0.12;

const WAVE = {
  width: size.noteWidth - size.target - size.mediaControl,
  height: size.noteWave,
} as const;

const barStyle = (peak: number) => ({
  width: size.noteBar,
  height: Math.max(MIN_BAR, peak / 100) * size.noteWave,
});

export function NoteWave({ peaks, progress }: NoteWaveProps) {
  const played = Math.round(progress * peaks.length);
  return (
    <View aria-hidden style={WAVE} className="flex-row items-center justify-between">
      {peaks.map((peak, index) => (
        <View
          key={index}
          style={barStyle(peak)}
          className={clsx('rounded-full', index < played ? 'bg-text' : 'bg-text-3')}
        />
      ))}
    </View>
  );
}

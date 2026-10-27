import { clsx } from 'clsx';
import { View } from 'react-native';
import { size } from '@/shared/theme';
import { barToneOf } from '@/features/conversations/model/voice-note';

export type NoteWaveProps = { peaks: readonly number[]; progress: number; active: boolean };

const MIN_BAR = 0.12;

export const NOTE_WAVE_WIDTH = size.noteWidth - size.target - size.mediaControl;

const WAVE = { width: NOTE_WAVE_WIDTH, height: size.noteWave } as const;

const barStyle = (peak: number) => ({
  width: size.noteBar,
  height: Math.max(MIN_BAR, peak / 100) * size.noteWave,
});

export function NoteWave({ peaks, progress, active }: NoteWaveProps) {
  const played = Math.round(progress * peaks.length);
  return (
    <View aria-hidden style={WAVE} className="flex-row items-center justify-between">
      {peaks.map((peak, index) => (
        <View
          key={index}
          style={barStyle(peak)}
          className={clsx(
            'rounded-full',
            barToneOf(index, played, active) === 'played' ? 'bg-accent' : 'bg-text-3'
          )}
        />
      ))}
    </View>
  );
}

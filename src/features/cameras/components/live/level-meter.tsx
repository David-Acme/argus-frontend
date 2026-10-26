import { clsx } from 'clsx';
import { View } from 'react-native';
import { METER_BARS, litBars } from '@/features/cameras/model/talk-dock';

export type LevelMeterProps = { level: number; label: string };

const BARS = Array.from({ length: METER_BARS }, (_, index) => index);

export function LevelMeter({ level, label }: LevelMeterProps) {
  const lit = litBars(level);
  return (
    <View
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={METER_BARS}
      aria-valuenow={lit}
      className="w-40 flex-row gap-1">
      {BARS.map((bar) => (
        <View
          key={bar}
          className={clsx('h-meter rounded-meter flex-1', bar < lit ? 'bg-accent-fill' : 'bg-fill')}
        />
      ))}
    </View>
  );
}

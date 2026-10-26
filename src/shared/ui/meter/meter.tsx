import { View } from 'react-native';

export type MeterProps = { fraction: number; label: string };

const percentOf = (fraction: number): `${number}%` =>
  `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%`;

export function Meter({ fraction, label }: MeterProps) {
  const fill = { width: percentOf(fraction) };
  return (
    <View
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(1, Math.max(0, fraction)) * 100)}
      className="h-meter rounded-meter bg-fill-press overflow-hidden">
      <View className="rounded-meter bg-accent-fill h-full" style={fill} />
    </View>
  );
}

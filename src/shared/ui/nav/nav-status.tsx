import { View } from 'react-native';
import { size } from '@/shared/theme';
import { Icon, type IconGlyph } from '@/shared/ui/icon';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { NavPresence } from './nav-types';

export type NavStatusRow = { icon: IconGlyph; before?: string; strong: string; after?: string };

export type NavStatusMeter = { label: string; value: string; fraction: number };

export type NavStatusProps = {
  title: string;
  rows: readonly NavStatusRow[];
  meter?: NavStatusMeter;
  ask: { label: string; onPress: () => void };
  presence?: NavPresence;
};

type MeterProps = { meter: NavStatusMeter };

const ASK_SLOP = (size.target - size.askField) / 2;

function Row({ icon, before, strong, after }: NavStatusRow) {
  return (
    <View className="flex-row items-center gap-2">
      <Icon name={icon} size="small" tone="accent" />
      <Text variant="sideStat" tone="2">
        {before ? `${before} ` : null}
        <Text variant="sideStatStrong">{strong}</Text>
        {after ? ` ${after}` : null}
      </Text>
    </View>
  );
}

function Meter({ meter }: MeterProps) {
  const fill = { width: `${Math.round(Math.min(1, Math.max(0, meter.fraction)) * 100)}%` } as const;
  return (
    <View>
      <View className="flex-row items-center justify-between gap-2">
        <Text variant="sideStat" tone="2">
          {meter.label}
        </Text>
        <Text variant="sideStatStrong">{meter.value}</Text>
      </View>
      <View className="h-meter rounded-meter bg-fill-press mt-1 overflow-hidden">
        <View className="rounded-meter bg-accent-fill h-full" style={fill} />
      </View>
    </View>
  );
}

export function NavStatus({ title, rows, meter, ask, presence }: NavStatusProps) {
  return (
    <View className="bg-fill rounded-button gap-nav-stat-gap p-nav-stat-pad mx-nav-stat-x my-2">
      <Text variant="sideStatStrong">{title}</Text>
      {rows.map((row) => (
        <Row key={row.strong} {...row} />
      ))}
      {meter ? <Meter meter={meter} /> : null}
      <PressableSurface
        a11y={{ label: ask.label, role: 'button' }}
        onPress={ask.onPress}
        hitSlop={ASK_SLOP}
        className="min-h-ask-field rounded-control bg-surface px-nav-ask-x gap-nav-ask-gap flex-row items-center">
        {presence ? presence(size.presenceAsk, false) : null}
        <Text variant="sideStat" tone="3" numberOfLines={1}>
          {ask.label}
        </Text>
      </PressableSurface>
    </View>
  );
}

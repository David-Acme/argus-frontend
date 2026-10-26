import { View } from 'react-native';
import { useThemeTokens } from '@/shared/theme';
import { PressableSurface } from '@/shared/ui/pressable';
import type { DayCell, MonthCell } from '@/features/agenda/model/agenda-days';
import { DayButton, DayLetters, MonthGrid } from '@/features/agenda/components/month-grid';
import type { DayNames, MonthShift } from '@/features/agenda/components/month-grid';

export type WeekStripProps = {
  week: readonly DayCell[];
  month: readonly MonthCell[];
  names: DayNames;
  expanded: boolean;
  toggleLabel: string;
  shift: MonthShift;
  onToggle: () => void;
  onPick: (at: number) => void;
};

export function WeekStrip({
  week,
  month,
  names,
  expanded,
  toggleLabel,
  shift,
  onToggle,
  onPick,
}: WeekStripProps) {
  const { elevation } = useThemeTokens();
  const card = { boxShadow: elevation.card };
  return (
    <View className="rounded-card bg-surface px-2 pt-2" style={card} testID="agenda-week-strip">
      {expanded ? (
        <MonthGrid cells={month} names={names} onPick={onPick} shift={shift} />
      ) : (
        <>
          <DayLetters cells={week} names={names} />
          <View className="flex-row">
            {week.map((cell) => (
              <DayButton key={cell.at} cell={cell} names={names} onPick={onPick} look="week" />
            ))}
          </View>
        </>
      )}
      <PressableSurface
        a11y={{ label: toggleLabel, role: 'button' }}
        onPress={onToggle}
        className="min-h-target-min items-center justify-center">
        <View className="w-grabber-width h-grabber-height bg-fill-press rounded-full" />
      </PressableSurface>
    </View>
  );
}

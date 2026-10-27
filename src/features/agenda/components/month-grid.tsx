import { clsx } from 'clsx';
import { View } from 'react-native';
import { inset } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text } from '@/shared/ui/text';
import type { DayCell, MonthCell } from '@/features/agenda/model/agenda-days';
import type { DayNames, MonthShift } from '@/features/agenda/model/agenda-view';

export type MonthGridProps = {
  cells: readonly MonthCell[];
  names: DayNames;
  onPick: (at: number) => void;
  shift?: MonthShift;
  small?: boolean;
};

export type DayButtonProps = {
  cell: DayCell & { inMonth?: boolean };
  names: DayNames;
  onPick: (at: number) => void;
  look: 'week' | 'month' | 'small';
};

export type DayLettersProps = { cells: readonly DayCell[]; names: DayNames };

type ShiftHeadProps = { shift: MonthShift };

const RING = { borderWidth: inset.field.border };

const DISC = { week: 'size-10', month: 'size-10', small: 'size-9' } as const;

const WEEK = 7;

function discClass({ selected, today }: DayCell): string {
  if (selected) return 'bg-ink border-transparent';
  return today ? 'border-accent-fill' : 'border-transparent';
}

function numberTone(cell: DayButtonProps['cell']) {
  if (cell.selected) return 'on-ink';
  if (cell.today) return 'accent';
  return cell.inMonth === false ? '3' : 'default';
}

function numberVariant(cell: DayButtonProps['cell'], look: DayButtonProps['look']) {
  if (look === 'week') return 'headline';
  return cell.marked ? 'label' : 'feed';
}

export function DayButton({ cell, names, onPick, look }: DayButtonProps) {
  return (
    <View className="flex-1">
      <PressableSurface
        a11y={{ label: names.full(cell.at), role: 'button', selected: cell.selected }}
        onPress={() => onPick(cell.at)}
        pressed={{ scale: 'icon' }}
        className="items-center gap-1 py-1">
        <View
          style={RING}
          className={clsx('items-center justify-center rounded-full', DISC[look], discClass(cell))}>
          <Text variant={numberVariant(cell, look)} tone={numberTone(cell)}>
            {names.number(cell.at)}
          </Text>
        </View>
        {look === 'week' ? (
          <View
            className={clsx(
              'size-1.5 rounded-full',
              cell.marked ? 'bg-accent-fill' : 'bg-transparent'
            )}
          />
        ) : null}
      </PressableSurface>
    </View>
  );
}

export function DayLetters({ cells, names }: DayLettersProps) {
  return (
    <View className="flex-row" aria-hidden>
      {cells.slice(0, WEEK).map((cell) => (
        <View key={cell.at} className="flex-1 items-center py-1">
          <Text variant="caption" tone="3">
            {names.letter(cell.at)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ShiftHead({ shift }: ShiftHeadProps) {
  return (
    <View className="flex-row items-center justify-between px-1 pb-2">
      <Text variant="label">{shift.title}</Text>
      <View className="flex-row">
        <Button
          iconOnly
          compact
          icon="chevl"
          label={shift.previous}
          onPress={() => shift.onShift(-1)}
        />
        <Button iconOnly compact icon="chev" label={shift.next} onPress={() => shift.onShift(1)} />
      </View>
    </View>
  );
}

export function MonthGrid({ cells, names, onPick, shift, small }: MonthGridProps) {
  const weeks = Array.from({ length: Math.ceil(cells.length / WEEK) }, (_, index) =>
    cells.slice(index * WEEK, index * WEEK + WEEK)
  );
  return (
    <View>
      {shift ? <ShiftHead shift={shift} /> : null}
      <DayLetters cells={cells} names={names} />
      {weeks.map((week) => (
        <View key={week[0]?.at} className="flex-row">
          {week.map((cell) => (
            <DayButton
              key={cell.at}
              cell={cell}
              names={names}
              onPick={onPick}
              look={small ? 'small' : 'month'}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

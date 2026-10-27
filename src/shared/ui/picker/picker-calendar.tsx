import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { space, type PickerLayout } from '@/shared/theme';
import { Button } from '@/shared/ui/button';
import { PressableSurface } from '@/shared/ui/pressable';
import { Text, type TextTone } from '@/shared/ui/text';
import { focusDay } from './focus-day';
import {
  dayLook,
  dayStart,
  gridKey,
  monthGrid,
  monthOfDay,
  shiftMonth,
  weekdayOrder,
  type CalendarDay,
  type CalendarMonth,
  type DayLook,
} from './model/calendar';
import { CalendarHead, MonthWheels } from './picker-calendar-head';

export type PickerCalendarProps = {
  value: number | null;
  min: number | null;
  now: number;
  layout: PickerLayout;
  onPick: (at: number) => void;
  todayLink?: boolean;
};

type DayProps = {
  cell: CalendarDay;
  look: DayLook;
  focused: boolean;
  disc: { width: number; height: number };
  onPick: (at: number) => void;
};

type GridKeyEvent = { key: string; preventDefault: () => void };

const WEEK = 7;

const SWIPE = space[12];

const SUNDAY_2023 = new Date(2023, 0, 1).getTime();

const DAY_MS = 86_400_000;

function numberTone({ selected, today, disabled }: DayLook, inMonth: boolean): TextTone {
  if (selected) return 'on-ink';
  if (today) return 'accent';
  return disabled || !inMonth ? '3' : 'default';
}

function Day({ cell, look, focused, disc, onPick }: DayProps) {
  const date = useDateFormatter();
  const label = date.formatFullDate(new Date(cell.at));
  return (
    <View className="flex-1 items-center">
      <PressableSurface
        a11y={{ label, role: 'button', selected: look.selected, tabStop: focused }}
        disabled={look.disabled}
        onPress={() => onPick(cell.at)}
        pressed={{ scale: 'icon' }}
        style={disc}
        className={clsx(
          'items-center justify-center rounded-full',
          look.selected ? 'bg-accent' : 'web:hover:bg-fill',
          look.disabled && 'opacity-50'
        )}>
        <Text
          variant={look.today || look.selected ? 'label' : 'feed'}
          tone={numberTone(look, cell.inMonth)}>
          {String(cell.day)}
        </Text>
      </PressableSurface>
    </View>
  );
}

function useLetters(weekStart: number): string[] {
  const date = useDateFormatter();
  return weekdayOrder(weekStart).map((weekday) =>
    date
      .formatWeekdayShort(new Date(SUNDAY_2023 + weekday * DAY_MS))
      .charAt(0)
      .toLocaleUpperCase()
  );
}

type GridProps = {
  month: CalendarMonth;
  focus: number;
  value: number | null;
  min: number | null;
  today: number;
  disc: { width: number; height: number };
  onPick: (at: number) => void;
};

function Weeks({ month, focus, value, min, today, disc, onPick }: GridProps) {
  const date = useDateFormatter();
  const cells = monthGrid(month, date.weekStart);
  const letters = useLetters(date.weekStart);
  const weeks = Array.from({ length: cells.length / WEEK }, (_, row) =>
    cells.slice(row * WEEK, row * WEEK + WEEK)
  );
  return (
    <>
      <View className="flex-row" aria-hidden>
        {letters.map((letter, index) => (
          <View key={`${letter}-${index}`} className="flex-1 items-center">
            <Text variant="caption" tone="3">
              {letter}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.at} role="row" className="flex-row">
          {week.map((cell) => (
            <Day
              key={cell.at}
              cell={cell}
              look={dayLook(cell.at, { today, selected: value, min })}
              focused={cell.at === focus}
              disc={disc}
              onPick={onPick}
            />
          ))}
        </View>
      ))}
    </>
  );
}

function useGridFocus(start: number, onMonth: (month: CalendarMonth) => void) {
  const date = useDateFormatter();
  const grid = useRef<View>(null);
  const moved = useRef(false);
  const [focus, setFocus] = useState(start);
  const keys = {
    onKeyDown: (event: GridKeyEvent) => {
      const next = gridKey(focus, event.key, date.weekStart);
      if (next === null) return;
      event.preventDefault();
      moved.current = true;
      setFocus(next);
      onMonth(monthOfDay(next));
    },
  };
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    focusDay(grid.current, date.formatFullDate(new Date(focus)));
  }, [focus, date]);
  return { grid, focus, keys };
}

export function PickerCalendar({
  value,
  min,
  now,
  layout,
  onPick,
  todayLink,
}: PickerCalendarProps) {
  const { t } = useTranslation();
  const [month, setMonth] = useState<CalendarMonth>(() => monthOfDay(value ?? now));
  const [choosing, setChoosing] = useState(false);
  const { grid, focus, keys } = useGridFocus(dayStart(value ?? now), setMonth);
  const today = dayStart(now);
  const disc = { width: layout.day, height: layout.day };
  const shift = (step: number) => setMonth((current) => shiftMonth(current, step));
  const swipe = Gesture.Pan()
    .activeOffsetX([-space[4], space[4]])
    .failOffsetY([-space[3], space[3]])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < SWIPE) return;
      scheduleOnRN(shift, event.translationX < 0 ? 1 : -1);
    });
  return (
    <View className="gap-2">
      <CalendarHead
        month={month}
        choosing={choosing}
        onChoose={() => setChoosing(!choosing)}
        onShift={shift}
      />
      {choosing ? (
        <MonthWheels month={month} now={now} rows={layout.rows} onChange={setMonth} />
      ) : (
        <GestureDetector gesture={swipe}>
          <View ref={grid} role="grid" collapsable={false} className="gap-1" {...keys}>
            <Weeks
              month={month}
              focus={focus}
              value={value}
              min={min}
              today={today}
              disc={disc}
              onPick={onPick}
            />
          </View>
        </GestureDetector>
      )}
      {todayLink ? (
        <View className="items-start">
          <Button
            variant="ghost"
            compact
            label={t('common.picker.today')}
            onPress={() => onPick(today)}
          />
        </View>
      ) : null}
    </View>
  );
}

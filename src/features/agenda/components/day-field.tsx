import { useState } from 'react';
import { View } from 'react-native';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useDayNames } from '@/features/agenda/hooks/use-day-names';
import { monthCells, monthOf, shiftMonth } from '@/features/agenda/model/agenda-days';
import { FormLine } from '@/features/agenda/components/form-line';
import { MonthGrid } from '@/features/agenda/components/month-grid';

export type DayFieldProps = { day: number; now: number; onChange: (day: number) => void };

const NO_MARKS: ReadonlySet<number> = new Set();

export function DayField({ day, now, onChange }: DayFieldProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const names = useDayNames();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOf(day));
  const cells = monthCells(month, { selected: day, now, marks: NO_MARKS }, date);
  const pick = (at: number) => {
    onChange(at);
    setOpen(false);
  };
  return (
    <View>
      <FormLine
        label={t('screens.agenda.sheet.day')}
        value={date.formatPickerDay(new Date(day))}
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <View className="pb-2">
          <MonthGrid
            cells={cells}
            names={names}
            onPick={pick}
            shift={{
              title: date.formatMonthYear(new Date(month)),
              previous: t('screens.agenda.page.previous-month'),
              next: t('screens.agenda.page.next-month'),
              onShift: (step) => setMonth(shiftMonth(month, step, date)),
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

import type { ReactElement, ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { CalendarDayList } from '@/features/agenda/components/calendar-day-list';
import { CalendarMonthView } from '@/features/agenda/components/calendar-month-view';

export type EntryHandlers = {
  onSelect: (entry: CalendarEntry) => void;
  onLongPress?: (entry: CalendarEntry) => void;
  renderActions: (entry: CalendarEntry) => ReactNode;
  renderContextMenu?: (entry: CalendarEntry, trigger: ReactElement) => ReactNode;
};

type MonthPanelProps = {
  anchor: Date;
  selectedDay: Date;
  entries: readonly CalendarEntry[];
  dayEntries: readonly CalendarEntry[];
  wide: boolean;
  fill: boolean;
  handlers: EntryHandlers;
  onSelectDay: (day: Date) => void;
  onCreate?: () => void;
};

export function MonthPanel({
  anchor,
  selectedDay,
  entries,
  dayEntries,
  wide,
  fill,
  handlers,
  onSelectDay,
  onCreate,
}: MonthPanelProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomNavInset = useBottomNavInset();

  const body = (
    <>
      <View className={wide ? 'min-w-0 flex-1' : undefined}>
        <CalendarMonthView
          anchor={anchor}
          selected={selectedDay}
          entries={entries}
          onSelectDay={onSelectDay}
          fill={fill}
        />
      </View>
      <View
        className={
          wide ? 'bg-divider/30 w-hairline self-stretch' : 'bg-divider/30 h-hairline w-full'
        }
      />
      <View className={wide ? 'min-h-0 w-[300px] shrink-0 gap-2 lg:w-[340px]' : 'gap-2'}>
        <View className="min-h-9 flex-row items-center justify-between gap-3">
          <Text variant="label" className="font-semibold" numberOfLines={1}>
            {date.formatAgendaDay(selectedDay)}
          </Text>
          {dayEntries.length > 0 ? (
            <Text variant="caption">
              {t('screens.agenda.day-count', { count: String(dayEntries.length) })}
            </Text>
          ) : null}
        </View>
        <CalendarDayList
          entries={dayEntries}
          emptyLabel={t('screens.agenda.day-empty')}
          addLabel={onCreate ? t('screens.agenda.add-here') : undefined}
          onCreate={onCreate}
          fillCreate={wide}
          renderActions={handlers.renderActions}
          onSelect={handlers.onSelect}
          onLongPress={handlers.onLongPress}
          renderContextMenu={handlers.renderContextMenu}
        />
      </View>
    </>
  );

  if (wide) {
    return (
      <View
        className="flex-1 flex-row items-stretch gap-5"
        style={{ paddingBottom: bottomNavInset }}>
        {body}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-3"
      contentContainerStyle={{ paddingBottom: bottomNavInset }}
      showsVerticalScrollIndicator={false}>
      {body}
    </ScrollView>
  );
}

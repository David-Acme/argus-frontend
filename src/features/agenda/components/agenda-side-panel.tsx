import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { CalendarEntry, CalendarSource, IconName, TranslationKey } from '@/core/types';
import { CalendarMonthView } from '@/features/agenda/components/calendar-month-view';
import { agendaSummary, type AgendaRange } from '@/features/agenda/model/agenda-rows';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { Text } from '@/shared/components/ui/text';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';

type AgendaSidePanelProps = {
  anchor: Date;
  selected: Date;
  monthEntries: readonly CalendarEntry[];
  entries: readonly CalendarEntry[];
  range: AgendaRange;
  now: number;
  onSelectDay: (day: Date) => void;
  onSelectEntry: (entry: CalendarEntry) => void;
  onCreate?: () => void;
};

type CountRowProps = {
  icon: IconName;
  label: string;
  value: number;
};

const COUNT_ROWS: readonly { source: CalendarSource; icon: IconName; label: TranslationKey }[] = [
  { source: 'event', icon: 'calendar', label: 'screens.agenda.summary-events' },
  { source: 'task', icon: 'list-todo', label: 'screens.agenda.summary-tasks' },
  { source: 'reminder', icon: 'bell', label: 'screens.agenda.summary-reminders' },
];

function CountRow({ icon, label, value }: CountRowProps) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="bg-surface-secondary size-8 items-center justify-center rounded-full">
        <Icon name={icon} className="text-foreground-secondary size-4" />
      </View>
      <Text variant="body" className="text-foreground-secondary min-w-0 flex-1" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="body" className="font-semibold">
        {String(value)}
      </Text>
    </View>
  );
}

export function AgendaSidePanel({
  anchor,
  selected,
  monthEntries,
  entries,
  range,
  now,
  onSelectDay,
  onSelectEntry,
  onCreate,
}: AgendaSidePanelProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const bottomInset = useBottomNavInset();
  const summary = useMemo(() => agendaSummary(entries, range, now, date), [date, entries, now, range]);
  const next = summary.next;

  const nextWhen = (entry: CalendarEntry) => {
    const day = new Date(entry.startsAt);
    const today = new Date(now);
    const dayLabel = date.sameDay(day, today)
      ? t('screens.agenda.today')
      : date.sameDay(day, date.addDays(today, 1))
        ? t('screens.agenda.tomorrow')
        : date.formatPickerDay(day);
    const time = entry.isAllDay
      ? t('screens.agenda.event-all-day')
      : date.formatTimeRange(day, entry.endsAt ? new Date(entry.endsAt) : null);
    return `${dayLabel} · ${time}`;
  };

  return (
    <View className="w-[288px] shrink-0 lg:w-[320px] xl:w-[360px]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-4"
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}>
        <Panel className="gap-1 px-3 pt-3 pb-2">
          <CalendarMonthView
            anchor={anchor}
            selected={selected}
            entries={monthEntries}
            onSelectDay={onSelectDay}
            mini
          />
        </Panel>

        <Panel
          title={t('screens.agenda.summary-title')}
          description={date.formatDayRange(new Date(range.from), new Date(range.to))}>
          <View className="gap-2.5">
            {COUNT_ROWS.map((row) => (
              <CountRow key={row.source} icon={row.icon} label={t(row.label)} value={summary.counts[row.source]} />
            ))}
            {summary.busyDays + summary.freeDays > 1 ? (
            <CountRow icon="moon" label={t('screens.agenda.summary-free-days')} value={summary.freeDays} />
          ) : null}
          </View>
        </Panel>

        <Panel title={t('screens.agenda.next-title')} className="flex-1">
          {next ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelectEntry(next)}
              className="bg-surface-secondary dark:bg-card-secondary web:hover:opacity-90 gap-1 rounded-2xl p-3.5 active:opacity-80">
              <Text variant="micro" className="text-accent-strong font-semibold tracking-[0.6px] uppercase">
                {nextWhen(next)}
              </Text>
              <Text variant="subhead" className="font-semibold" numberOfLines={2}>
                {next.title}
              </Text>
              <Text variant="caption" numberOfLines={1}>
                {[t(`screens.agenda.entry-${next.source}`), next.location].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
          ) : (
            <View className="flex-1 items-start justify-center gap-3 py-2">
              <Text variant="caption">{t('screens.agenda.next-empty')}</Text>
              {onCreate ? (
                <Button variant="outline" size="sm" onPress={onCreate}>
                  <Icon name="plus" className="text-foreground size-4" />
                  <Text>{t('screens.agenda.new-event')}</Text>
                </Button>
              ) : null}
            </View>
          )}
        </Panel>
      </ScrollView>
    </View>
  );
}

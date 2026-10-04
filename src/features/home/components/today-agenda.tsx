import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { calendarEntryState } from '@/core/services/view-cache';
import { AgendaItem, isPendingEntry } from '@/features/agenda';
import { Panel } from '@/shared/components/ui/panel';

type TodayAgendaProps = {
  entries: readonly CalendarEntry[];
  now: number;
  formatTime: (entry: CalendarEntry) => string;
  renderActions: (entry: CalendarEntry) => ReactNode;
  onSelect: (entry: CalendarEntry) => void;
  onCreateAt?: (at: number) => void;
};

type HourRowProps = {
  label: string;
  current: boolean;
  children: ReactNode;
};

const HOURS_BEFORE = 1;
const HOURS_AFTER = 6;

function HourRow({ label, current, children }: HourRowProps) {
  return (
    <View className="flex-row items-start gap-3">
      <Text
        variant="label"
        className={cn('w-14 pt-3 tabular-nums', current ? 'text-accent-strong' : 'text-foreground-secondary')}>
        {label}
      </Text>
      <View className="min-w-0 flex-1 gap-2">{children}</View>
    </View>
  );
}

function NowMarker({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-2" accessibilityRole="text" accessibilityLabel={label}>
      <View className="bg-accent -ml-1 size-2 rounded-full" />
      <View className="bg-accent h-0.5 flex-1 rounded-full" />
    </View>
  );
}

function hourStart(day: Date, hour: number): number {
  const at = new Date(day);
  at.setHours(hour, 0, 0, 0);
  return at.getTime();
}

export function TodayAgenda({
  entries,
  now,
  formatTime,
  renderActions,
  onSelect,
  onCreateAt,
}: TodayAgendaProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const today = new Date(now);
  const currentHour = today.getHours();
  const allDay = entries.filter((entry) => entry.isAllDay);
  const timed = entries
    .filter((entry) => !entry.isAllDay)
    .sort((left, right) => left.startsAt - right.startsAt);

  const byHour = new Map<number, CalendarEntry[]>();
  for (const entry of timed) {
    const hour = date.hourOf(new Date(entry.startsAt));
    byHour.set(hour, [...(byHour.get(hour) ?? []), entry]);
  }
  const first = Math.max(0, currentHour - HOURS_BEFORE);
  const last = Math.min(23, currentHour + HOURS_AFTER);
  const hours = [
    ...new Set([...Array.from({ length: last - first + 1 }, (_, index) => first + index), ...byHour.keys()]),
  ].sort((left, right) => left - right);

  const item = (entry: CalendarEntry) => (
    <AgendaItem
      key={entry.id}
      title={entry.title}
      time={formatTime(entry)}
      state={calendarEntryState(entry, now)}
      pending={isPendingEntry(entry)}
      onPress={() => onSelect(entry)}
      actions={renderActions(entry)}
    />
  );

  return (
    <Panel className="gap-1.5 p-3">
      {allDay.length > 0 ? (
        <View className="flex-row items-start gap-3 pb-1">
          <View
            className="w-14 items-start pt-3.5"
            accessible
            accessibilityLabel={t('screens.agenda.event-all-day')}>
            <Icon name="sun" className="text-foreground-secondary size-4" />
          </View>
          <View className="min-w-0 flex-1 gap-2">{allDay.map(item)}</View>
        </View>
      ) : null}
      {hours.map((hour) => {
        const slot = byHour.get(hour) ?? [];
        const current = hour === currentHour;
        const before = slot.filter((entry) => entry.startsAt <= now);
        const after = slot.filter((entry) => entry.startsAt > now);
        return (
          <HourRow key={hour} label={date.formatHour(hour)} current={current}>
            {before.map(item)}
            {current ? (
              <View className="h-11 px-3" style={{ paddingTop: Math.round((today.getMinutes() / 60) * 40) }}>
                <NowMarker label={t('screens.home.now')} />
              </View>
            ) : null}
            {after.map(item)}
            {slot.length === 0 && !current ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('screens.agenda.new-event')} ${date.formatHour(hour)}`}
                disabled={!onCreateAt}
                onPress={() => onCreateAt?.(hourStart(today, hour))}
                className="group h-11 justify-center rounded-2xl px-3 web:hover:bg-surface-secondary">
                <View className="border-border-subtle border-t border-dashed" />
              </Pressable>
            ) : null}
          </HourRow>
        );
      })}
    </Panel>
  );
}

import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { AgendaItem } from './agenda-item';

type TodayAgendaProps = {
  entries: readonly CalendarEntry[];
  now: number;
  formatTime: (entry: CalendarEntry) => string;
  renderActions: (entry: CalendarEntry) => ReactNode;
  onSelect: (entry: CalendarEntry) => void;
};

function NowMarker({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3" accessibilityRole="text">
      <Text variant="micro" className="text-accent-strong w-14 font-semibold">
        {label}
      </Text>
      <View className="bg-accent h-0.5 flex-1 rounded-full" />
    </View>
  );
}

export function TodayAgenda({ entries, now, formatTime, renderActions, onSelect }: TodayAgendaProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const allDay = entries.filter((entry) => entry.isAllDay);
  const timed = entries
    .filter((entry) => !entry.isAllDay)
    .sort((left, right) => left.startsAt - right.startsAt);
  const nextIndex = timed.findIndex((entry) => entry.startsAt > now);
  const markerAt = nextIndex === -1 ? (timed.length > 0 ? timed.length : -1) : nextIndex;

  const item = (entry: CalendarEntry) => (
    <AgendaItem
      title={entry.title}
      time={formatTime(entry)}
      status={entry.status}
      onPress={() => onSelect(entry)}
      actions={renderActions(entry)}
    />
  );

  return (
    <View className="gap-2.5">
      {allDay.length > 0 ? (
        <View className="flex-row items-start gap-3">
          <Text variant="label" className="text-foreground-secondary w-14 pt-3">
            {t('screens.agenda.event-all-day')}
          </Text>
          <View className="min-w-0 flex-1 gap-2.5">
            {allDay.map((entry) => (
              <View key={entry.id}>{item(entry)}</View>
            ))}
          </View>
        </View>
      ) : null}
      {timed.map((entry, index) => (
        <View key={entry.id} className="gap-2.5">
          {index === markerAt ? <NowMarker label={t('screens.home.now')} /> : null}
          <View className="flex-row items-start gap-3">
            <Text variant="label" className="text-foreground-secondary w-14 pt-3">
              {date.formatTime(new Date(entry.startsAt))}
            </Text>
            <View className="min-w-0 flex-1">{item(entry)}</View>
          </View>
        </View>
      ))}
      {markerAt === timed.length && timed.length > 0 ? <NowMarker label={t('screens.home.now')} /> : null}
    </View>
  );
}

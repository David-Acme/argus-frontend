import { useMemo } from 'react';
import { View } from 'react-native';
import { calendarEntryState } from '@/core/services/view-cache';
import type { CalendarEntry } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  calendarEntryDetailDialogLayout,
  calendarEntryDetailRows,
} from '@/features/agenda/model/calendar-entry-actions';

type CalendarEntryDetailProps = {
  entry: CalendarEntry | null;
  now: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CalendarEntryDetail({ entry, now, open, onOpenChange }: CalendarEntryDetailProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const dialogLayout = calendarEntryDetailDialogLayout();
  const rows = useMemo(() => {
    if (!entry) return [];

    return calendarEntryDetailRows({
      entry,
      state: calendarEntryState(entry, now),
      labels: {
        type: t('screens.agenda.detail-type'),
        status: t('screens.agenda.detail-status'),
        date: t('screens.agenda.event-day'),
        time: t('screens.agenda.event-time'),
        allDay: t('screens.agenda.event-all-day'),
        location: t('screens.agenda.event-location'),
        event: t('screens.agenda.entry-event'),
        task: t('screens.agenda.entry-task'),
        reminder: t('screens.agenda.entry-reminder'),
        state: {
          upcoming: t('screens.agenda.state-upcoming'),
          ongoing: t('screens.agenda.state-ongoing'),
          today: t('screens.agenda.state-today'),
          ended: t('screens.agenda.state-ended'),
          overdue: t('screens.agenda.state-overdue'),
          todo: t('screens.agenda.state-todo'),
          doing: t('screens.agenda.state-doing'),
          done: t('screens.agenda.state-done'),
        },
      },
      formatDate: (value) => date.formatFullDate(new Date(value)),
      formatTime: (item) =>
        date.formatTimeRange(new Date(item.startsAt), item.endsAt ? new Date(item.endsAt) : null),
    });
  }, [date, entry, now, t]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry?.title ?? ''}
      closeLabel={t('common.close')}
      contentClassName={dialogLayout.contentClassName}
      footer={
        <View className={dialogLayout.footerClassName}>
          <Button onPress={() => onOpenChange(false)}>
            <Text>{t('common.close')}</Text>
          </Button>
        </View>
      }>
      <View className="gap-4 py-1">
        {rows.map((row) => (
          <View key={row.id} className="gap-1">
            <Text variant="micro" className="text-muted-foreground font-medium">{row.label}</Text>
            <Text className="text-body font-medium">{row.value}</Text>
          </View>
        ))}
      </View>
    </AdaptiveDialog>
  );
}

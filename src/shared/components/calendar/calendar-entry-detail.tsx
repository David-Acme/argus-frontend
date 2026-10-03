import { useMemo } from 'react';
import { View } from 'react-native';
import type { CalendarEntry } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import {
  calendarEntryDetailDialogLayout,
  calendarEntryDetailRows,
} from '@/shared/libs/calendar-entry-actions';

type CalendarEntryDetailProps = {
  entry: CalendarEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CalendarEntryDetail({ entry, open, onOpenChange }: CalendarEntryDetailProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const dialogLayout = calendarEntryDetailDialogLayout();
  const rows = useMemo(() => {
    if (!entry) return [];

    return calendarEntryDetailRows(
      entry,
      {
        type: t('screens.agenda.detail-type'),
        status: t('screens.agenda.detail-status'),
        date: t('screens.agenda.event-day'),
        time: t('screens.agenda.event-time'),
        allDay: t('screens.agenda.event-all-day'),
        location: t('screens.agenda.event-location'),
        event: t('screens.agenda.entry-event'),
        task: t('screens.agenda.entry-task'),
        reminder: t('screens.agenda.entry-reminder'),
        upcoming: t('screens.agenda.status-upcoming'),
        active: t('screens.agenda.status-active'),
        complete: t('screens.agenda.status-complete'),
      },
      (value) => date.formatFullDate(new Date(value)),
      (item) =>
        date.formatTimeRange(new Date(item.startsAt), item.endsAt ? new Date(item.endsAt) : null)
    );
  }, [date, entry, t]);

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

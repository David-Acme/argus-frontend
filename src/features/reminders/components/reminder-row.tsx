import { Pressable, View } from 'react-native';
import type { IReminderCacheRow } from '@/core/interfaces';
import type { MenuOption, TranslationKey } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { recurrenceLabel } from '@/shared/libs/recurrence';
import { cn } from '@/shared/libs/utils';
import { repeatsOf } from '@/features/reminders/model/reminder-repeat';
import { reminderTiming, reminderWhen } from '@/features/reminders/model/reminder-rows';
import { isSnoozable, type SnoozeChoice, type SnoozeOption } from '@/features/reminders/model/reminder-snooze';

type ReminderRowProps = {
  reminder: IReminderCacheRow;
  now: number;
  editable: boolean;
  snoozeOptions: readonly SnoozeOption[];
  onToggle: (reminder: IReminderCacheRow, done: boolean) => void;
  onEdit: (reminder: IReminderCacheRow) => void;
  onSnooze: (reminder: IReminderCacheRow, choice: SnoozeChoice) => void;
  onStopRepeating: (reminder: IReminderCacheRow) => void;
  onDelete: (reminder: IReminderCacheRow) => void;
};

const SNOOZE_LABEL = {
  '10': 'screens.reminders.snooze-10',
  '30': 'screens.reminders.snooze-30',
  '60': 'screens.reminders.snooze-60',
  tomorrow: 'screens.reminders.snooze-tomorrow',
} as const satisfies Record<SnoozeChoice, TranslationKey>;

type ReminderAction = 'edit' | 'stop-repeating' | 'delete';

export function ReminderRow({
  reminder,
  now,
  editable,
  snoozeOptions,
  onToggle,
  onEdit,
  onSnooze,
  onStopRepeating,
  onDelete,
}: ReminderRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const pending = isPendingRecordId(reminder.id);
  const timing = reminderTiming(reminder, now, date);
  const overdue = timing === 'overdue';
  const when = reminderWhen(reminder, now, date, t);
  const repeats = repeatsOf(reminder);
  const repeat = recurrenceLabel(reminder.recurrenceRule, t);
  const caption = [overdue ? t('screens.reminders.overdue') : null, when, repeat].filter(Boolean).join(' · ');
  const options: MenuOption<ReminderAction>[] = [{ value: 'edit', label: t('common.edit'), icon: 'pencil' }];
  if (repeats) options.push({ value: 'stop-repeating', label: t('screens.reminders.stop-repeating'), icon: 'repeat-off' });
  options.push({ value: 'delete', label: t('common.delete'), icon: 'trash', destructive: true });

  const snoozable = editable && !pending && isSnoozable(timing) && snoozeOptions.length > 0;
  const snoozeMenu: MenuOption<SnoozeChoice>[] = snoozeOptions.map(({ choice, at }) => ({
    value: choice,
    label: t(SNOOZE_LABEL[choice]),
    description: t('screens.reminders.snooze-at', { time: date.formatTime(new Date(at)) }),
  }));

  const select = (action: ReminderAction) => {
    if (action === 'edit') onEdit(reminder);
    else if (action === 'stop-repeating') onStopRepeating(reminder);
    else onDelete(reminder);
  };

  return (
    <View className={cn('min-h-14 flex-row items-center gap-1 rounded-2xl px-1', pending && 'opacity-60')}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: reminder.isCompleted, disabled: !editable || pending }}
        accessibilityLabel={reminder.isCompleted ? t('screens.reminders.mark-pending') : t('screens.reminders.mark-done')}
        disabled={!editable || pending}
        hitSlop={4}
        onPress={() => onToggle(reminder, !reminder.isCompleted)}
        className="size-11 items-center justify-center active:opacity-70">
        <View
          className={cn(
            'size-6 items-center justify-center rounded-full border-2',
            reminder.isCompleted ? 'bg-success border-success' : overdue ? 'border-error' : 'border-border'
          )}>
          {reminder.isCompleted ? <Icon name="check" className="text-foreground-on-interactive size-3.5" /> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${reminder.title}. ${caption}`}
        disabled={!editable || pending}
        onPress={() => onEdit(reminder)}
        className="min-w-0 flex-1 gap-0.5 py-2 active:opacity-70">
        <Text
          variant="body"
          numberOfLines={2}
          className={cn('font-medium', reminder.isCompleted && 'text-muted-foreground line-through')}>
          {reminder.title}
        </Text>
        <View className="flex-row items-center gap-1">
          {repeats ? (
            <Icon
              name="repeat"
              className={cn('size-3.5', overdue ? 'text-error-strong' : 'text-muted-foreground')}
            />
          ) : null}
          <Text variant="caption" className={cn('min-w-0 flex-1', overdue && 'text-error-strong')} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      </Pressable>
      {snoozable ? (
        <AdaptiveMenu
          options={snoozeMenu}
          onSelect={(choice) => onSnooze(reminder, choice)}
          title={t('screens.reminders.snooze')}
          closeLabel={t('common.close')}
          trigger={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.reminders.snooze-label', { title: reminder.title })}
              hitSlop={6}
              className="size-10 items-center justify-center active:opacity-60">
              <Icon name="alarm-clock" className="text-muted-foreground size-4" />
            </Pressable>
          }
        />
      ) : null}
      {editable && !pending ? (
        <AdaptiveMenu
          options={options}
          onSelect={select}
          title={reminder.title}
          closeLabel={t('common.close')}
          trigger={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.reminders.options')}
              hitSlop={6}
              className="size-10 items-center justify-center active:opacity-60">
              <Icon name="more-horizontal" className="text-muted-foreground size-4" />
            </Pressable>
          }
        />
      ) : null}
    </View>
  );
}

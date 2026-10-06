import { Pressable, View } from 'react-native';
import type { IReminderCacheRow } from '@/core/interfaces';
import type { MenuOption } from '@/core/types';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { isPendingRecordId } from '@/shared/libs/optimistic';
import { cn } from '@/shared/libs/utils';
import { reminderTiming, reminderWhen } from '@/features/reminders/model/reminder-rows';

type ReminderRowProps = {
  reminder: IReminderCacheRow;
  now: number;
  editable: boolean;
  onToggle: (reminder: IReminderCacheRow, done: boolean) => void;
  onEdit: (reminder: IReminderCacheRow) => void;
  onDelete: (reminder: IReminderCacheRow) => void;
};

type ReminderAction = 'edit' | 'delete';

export function ReminderRow({ reminder, now, editable, onToggle, onEdit, onDelete }: ReminderRowProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const pending = isPendingRecordId(reminder.id);
  const timing = reminderTiming(reminder, now, date);
  const overdue = timing === 'overdue';
  const when = reminderWhen(reminder, now, date, t);
  const options: MenuOption<ReminderAction>[] = [
    { value: 'edit', label: t('common.edit'), icon: 'pencil' },
    { value: 'delete', label: t('common.delete'), icon: 'trash', destructive: true },
  ];

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
        accessibilityLabel={`${reminder.title}. ${when}`}
        disabled={!editable || pending}
        onPress={() => onEdit(reminder)}
        className="min-w-0 flex-1 gap-0.5 py-2 active:opacity-70">
        <Text
          variant="body"
          numberOfLines={2}
          className={cn('font-medium', reminder.isCompleted && 'text-muted-foreground line-through')}>
          {reminder.title}
        </Text>
        <Text variant="caption" className={cn(overdue && 'text-error-strong')} numberOfLines={1}>
          {overdue ? `${t('screens.reminders.overdue')} · ${when}` : when}
        </Text>
      </Pressable>
      {editable && !pending ? (
        <AdaptiveMenu
          options={options}
          onSelect={(action) => (action === 'edit' ? onEdit(reminder) : onDelete(reminder))}
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

import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { IReminderCacheRow, IServiceResponse } from '@/core/interfaces';
import { reminderService } from '@/core/services/reminder.service';
import type { MenuOption, RecurrenceFrequency, TranslationKey } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormScroll,
} from '@/shared/components/ui/form';
import { FormScrollView } from '@/shared/components/ui/form-scroll-view';
import { FormTextField } from '@/shared/components/ui/form-text-field';
import { Icon } from '@/shared/components/ui/icon';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { formatRecurrenceRule, recurrenceLabel } from '@/shared/libs/recurrence';
import { DayPickerField } from '@/features/agenda';
import {
  isEmptyUpdate,
  occurrenceMoveBody,
  REMINDER_DESCRIPTION_MAX,
  REMINDER_TITLE_MAX,
  updateBody,
} from '@/features/reminders/model/reminder-form';
import { reminderWhen } from '@/features/reminders/model/reminder-rows';
import {
  isIntervalText,
  REPEAT_CHOICES,
  repeatChoiceOf,
  repeatDraftOf,
  repeatFromChoice,
  repeatsOf,
  type RepeatChoice,
} from '@/features/reminders/model/reminder-repeat';

type ReminderDialogScope = 'series' | 'occurrence';

type ReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: IReminderCacheRow;
  scope?: ReminderDialogScope;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const INTERVAL_LABEL = {
  DAILY: 'screens.reminders.interval-daily',
  WEEKLY: 'screens.reminders.interval-weekly',
  MONTHLY: 'screens.reminders.interval-monthly',
  YEARLY: 'screens.reminders.interval-yearly',
} as const satisfies Record<RecurrenceFrequency, TranslationKey>;

const schema = z
  .object({
    title: z.string().trim().min(1, 'common.validation.required').max(REMINDER_TITLE_MAX, 'common.validation.too-long'),
    description: z.string().trim().max(REMINDER_DESCRIPTION_MAX, 'common.validation.too-long'),
    time: z.string().trim().regex(TIME_RE, 'common.validation.invalid-time'),
    day: z.number(),
    repeat: z.enum(REPEAT_CHOICES),
    interval: z.string(),
  })
  .refine((values) => values.repeat === 'none' || isIntervalText(values.interval), {
    path: ['interval'],
    message: 'common.validation.interval-range',
  });

type ReminderValues = z.infer<typeof schema>;

const NOTHING_TO_SAVE: IServiceResponse<unknown> = { status: 200, ok: true, info: null, errors: null };

export function ReminderDialog({ open, onOpenChange, reminder, scope = 'series' }: ReminderDialogProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const formScroll = useFormScroll();
  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<ReminderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      time: date.defaultInputTime(new Date()),
      day: date.startOfDay(new Date()).getTime(),
      repeat: 'none',
      interval: '1',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    const at = new Date(reminder.scheduledAt);
    const saved = repeatDraftOf(reminder.recurrenceRule);
    form.reset({
      title: reminder.title,
      description: reminder.description,
      time: date.formatInputTime(at),
      day: date.startOfDay(at).getTime(),
      repeat: repeatChoiceOf(saved),
      interval: String(saved.interval),
    });
  }, [date, form, open, reminder]);

  const single = scope === 'occurrence';
  const day = useWatch({ control: form.control, name: 'day' });
  const repeat = useWatch({ control: form.control, name: 'repeat' });
  const repeatOptions: MenuOption<RepeatChoice>[] = REPEAT_CHOICES.map((choice) => ({
    value: choice,
    label:
      choice === 'none'
        ? t('common.recurrence.none')
        : (recurrenceLabel(formatRecurrenceRule({ frequency: choice, interval: 1 }), t) ?? choice),
  }));

  const draftOf = (values: ReminderValues) => ({
    title: values.title,
    description: values.description,
    at: date.atInputTime(new Date(values.day), values.time).getTime(),
    repeat: repeatFromChoice(values.repeat, values.interval),
  });

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      if (single) {
        const move = occurrenceMoveBody(reminder, draftOf(values).at);
        return move === null ? Promise.resolve(NOTHING_TO_SAVE) : reminderService.changeOccurrence(reminder.id, move);
      }
      const body = updateBody(reminder, draftOf(values));
      return isEmptyUpdate(body) ? Promise.resolve(NOTHING_TO_SAVE) : reminderService.update(reminder.id, body);
    },
    optimistic: (values) => {
      if (single) {
        const at = draftOf(values).at;
        const move = occurrenceMoveBody(reminder, at);
        return {
          intents:
            move === null
              ? []
              : [{ table: 'reminder', kind: 'update', recordId: reminder.id, values: { scheduledAt: move.startsAt } }],
          success: t('screens.reminders.occurrence-saved', {
            when: reminderWhen({ ...reminder, scheduledAt: at }, Date.now(), date, t),
          }),
          errorTitle: t('screens.reminders.occurrence-failed'),
        };
      }
      const body = updateBody(reminder, draftOf(values));
      return {
        intents: isEmptyUpdate(body) ? [] : [{ table: 'reminder', kind: 'update', recordId: reminder.id, values: body }],
        success: t('screens.reminders.saved'),
      };
    },
    onSuccess: () => onOpenChange(false),
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next && submitting) return;
      onOpenChange(next);
    },
    [onOpenChange, submitting]
  );

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      dismissible={!submitting}
      onSubmit={submitting ? undefined : () => void submit()}
      title={
        single
          ? t('screens.reminders.edit-occurrence')
          : repeatsOf(reminder)
            ? t('screens.reminders.edit-series')
            : t('screens.reminders.edit')
      }
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => handleOpenChange(false)} disabled={submitting}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} disabled={submitting}>
            <Text>{submitting ? t('common.saving') : t('common.save')}</Text>
          </Button>
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="gap-3.5 pb-1">
            {single ? (
              <View className="bg-surface-secondary flex-row items-center gap-2 rounded-xl px-3 py-2.5">
                <Icon name="calendar-clock" className="text-muted-foreground size-4" />
                <Text variant="caption" className="flex-1">
                  {t('screens.reminders.occurrence-hint')}
                </Text>
              </View>
            ) : (
              <FormTextField
                control={form.control}
                name="title"
                label={t('screens.reminders.title-field')}
                placeholder={t('screens.reminders.title-placeholder')}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
            )}

            <FormItem>
              <FormLabel>{t('screens.reminders.day')}</FormLabel>
              <DayPickerField
                value={new Date(day)}
                onChange={(next) => form.setValue('day', date.startOfDay(next).getTime())}
              />
            </FormItem>

            <FormTextField
              control={form.control}
              name="time"
              label={t('screens.reminders.time')}
              placeholder="09:00"
              keyboardType="numbers-and-punctuation"
            />

            {single ? null : (
              <>
                <FormField
                  control={form.control}
                  name="repeat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.reminders.repeat')}</FormLabel>
                      <AdaptiveSelect
                        options={repeatOptions}
                        value={field.value}
                        onChange={field.onChange}
                        title={t('screens.reminders.repeat')}
                        closeLabel={t('common.close')}
                        searchPlaceholder={t('common.search')}
                        emptyLabel={t('common.recurrence.none')}
                        trigger={
                          <SelectField label={repeatOptions.find((option) => option.value === field.value)?.label} />
                        }
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {repeat !== 'none' ? (
                  <FormTextField
                    control={form.control}
                    name="interval"
                    label={t(INTERVAL_LABEL[repeat])}
                    placeholder="1"
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                ) : null}

                {repeat !== 'none' && repeatsOf(reminder) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onPress={() => form.setValue('repeat', 'none', { shouldDirty: true })}>
                    <Icon name="repeat-off" className="text-foreground-secondary size-4" />
                    <Text>{t('screens.reminders.stop-repeating')}</Text>
                  </Button>
                ) : null}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.reminders.notes')}</FormLabel>
                      <FormControl>
                        <Textarea numberOfLines={3} {...field} onChangeText={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </View>
        </Form>
      </FormScrollView>
    </AdaptiveDialog>
  );
}

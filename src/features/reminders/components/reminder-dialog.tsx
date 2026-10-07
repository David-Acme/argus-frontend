import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { IReminderCacheRow } from '@/core/interfaces';
import { reminderService } from '@/core/services/reminder.service';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
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
import { Text } from '@/shared/components/ui/text';
import { Textarea } from '@/shared/components/ui/textarea';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { DayPickerField } from '@/features/agenda';
import {
  isEmptyUpdate,
  REMINDER_DESCRIPTION_MAX,
  REMINDER_TITLE_MAX,
  updateBody,
} from '@/features/reminders/model/reminder-form';

type ReminderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: IReminderCacheRow;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  title: z.string().trim().min(1, 'common.validation.required').max(REMINDER_TITLE_MAX, 'common.validation.too-long'),
  description: z.string().trim().max(REMINDER_DESCRIPTION_MAX, 'common.validation.too-long'),
  time: z.string().trim().regex(TIME_RE, 'common.validation.invalid-time'),
  day: z.number(),
});

type ReminderValues = z.infer<typeof schema>;

export function ReminderDialog({ open, onOpenChange, reminder }: ReminderDialogProps) {
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
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    const at = new Date(reminder.scheduledAt);
    form.reset({
      title: reminder.title,
      description: reminder.description,
      time: date.formatInputTime(at),
      day: date.startOfDay(at).getTime(),
    });
  }, [date, form, open, reminder]);

  const day = useWatch({ control: form.control, name: 'day' });

  const draftOf = (values: ReminderValues) => ({
    title: values.title,
    description: values.description,
    at: date.atInputTime(new Date(values.day), values.time).getTime(),
  });

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = updateBody(reminder, draftOf(values));
      return isEmptyUpdate(body)
        ? Promise.resolve({ status: 200, ok: true, info: null, errors: null })
        : reminderService.update(reminder.id, body);
    },
    optimistic: (values) => {
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
      title={t('screens.reminders.edit')}
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
            <FormTextField
              control={form.control}
              name="title"
              label={t('screens.reminders.title-field')}
              placeholder={t('screens.reminders.title-placeholder')}
              returnKeyType="done"
              onSubmitEditing={submit}
            />

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
          </View>
        </Form>
      </FormScrollView>
    </AdaptiveDialog>
  );
}

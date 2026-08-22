import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import type { CalendarEventModel } from '@/core/database';
import { calendarEventService } from '@/core/services/calendar-event.service';

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
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { SettingRow } from '@/shared/components/cameras';
import { DayPickerField } from './day-picker-field';
import { Text } from '@/shared/components/ui/text';
import { useFormSubmit } from '@/shared/hooks/use-form-submit';
import { useOverlayBodyHeight } from '@/shared/hooks/use-overlay-body-height';
import { useTranslation } from '@/shared/hooks/use-translation';
import { startOfDay } from '@/shared/libs/calendar';
import { calendarEventFormActions } from '@/shared/libs/calendar-entry-actions';
import { toast } from '@/shared/libs/toast';

type CalendarEventFormProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Localized short weekday names for the day picker. */
  weekdayLabels: readonly string[];
  locale: string;
  /** Day the form starts on, so creating from a picked day lands there. */
  startsAt: Date;
  event?: CalendarEventModel | null;
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z
  .object({
    title: z.string().trim().min(1, 'common.validation.required').max(160, 'common.validation.too-long'),
    location: z.string().trim().max(160, 'common.validation.too-long'),
    time: z.string().trim().regex(TIME_RE, 'common.validation.invalid-number'),
    endTime: z.string().trim(),
    /** Epoch ms of the chosen day, so the picker is just another field. */
    day: z.number(),
    isAllDay: z.boolean(),
    description: z.string().trim().max(500, 'common.validation.too-long'),
  })
  .refine((values) => values.endTime === '' || TIME_RE.test(values.endTime), {
    path: ['endTime'],
    message: 'common.validation.invalid-number',
  })
  .refine((values) => values.endTime === '' || values.endTime > values.time, {
    path: ['endTime'],
    message: 'common.validation.invalid-range',
  });

type EventValues = z.infer<typeof schema>;

const hhmm = (at: Date): string =>
  `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;

/** New events start at the next full hour today, or mid-morning on another day. */
const defaultTime = (day: Date): string => {
  const now = new Date();
  if (day.toDateString() !== now.toDateString()) return '09:00';
  return `${String(Math.min(now.getHours() + 1, 23)).padStart(2, '0')}:00`;
};

/** `HH:mm` on the given day, in epoch seconds — what the endpoint expects. */
const secondsAt = (day: Date, time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  const at = new Date(day);
  at.setHours(hours, minutes, 0, 0);
  return Math.round(at.getTime() / 1000);
};

export function CalendarEventForm({
  open,
  onOpenChange,
  startsAt,
  event,
  weekdayLabels,
  locale,
}: CalendarEventFormProps) {
  const { t } = useTranslation();
  const formScroll = useFormScroll();

  const bodyHeight = useOverlayBodyHeight();

  const form = useForm<EventValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      location: '',
      time: defaultTime(new Date()),
      endTime: '',
      day: startOfDay(new Date()).getTime(),
      isAllDay: false,
      description: '',
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!open) return;
    const at = event?.startsAt ?? startsAt;
    const ends = event?.endsAt ?? null;
    form.reset({
      title: event?.title ?? '',
      location: event?.location ?? '',
      time: event ? hhmm(at) : defaultTime(at),
      endTime: ends ? hhmm(ends) : '',
      day: startOfDay(at).getTime(),
      isAllDay: event?.isAllDay ?? false,
      description: event?.description ?? '',
    });
  }, [open, event, startsAt, form]);

  const allDay = useWatch({ control: form.control, name: 'isAllDay' });
  const day = useWatch({ control: form.control, name: 'day' });

  const { submitting, submit } = useFormSubmit({
    form,
    formScroll,
    request: (values) => {
      const body = {
        title: values.title,
        location: values.location || undefined,
        description: values.description || undefined,
        isAllDay: values.isAllDay,
        startsAt: secondsAt(new Date(values.day), values.isAllDay ? '00:00' : values.time),
        endsAt:
          values.endTime && !values.isAllDay
            ? secondsAt(new Date(values.day), values.endTime)
            : undefined,
      };
      return event
        ? calendarEventService.update(event.id, body)
        : calendarEventService.create(body);
    },
    onSuccess: () => {
      toast.success(t('screens.agenda.event-saved'));
      onOpenChange(false);
    },
  });

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? t('common.edit') : t('screens.agenda.new-event')}
      closeLabel={t('common.close')}
      footer={
        <>
          {calendarEventFormActions().map((action) =>
            action === 'cancel' ? (
              <Button
                key={action}
                variant="outline"
                onPress={() => onOpenChange(false)}
                disabled={submitting}>
                <Text>{t('common.cancel')}</Text>
              </Button>
            ) : (
              <Button key={action} onPress={submit} disabled={submitting}>
                <Text>{submitting ? t('common.saving') : t('common.save')}</Text>
              </Button>
            )
          )}
        </>
      }>
      <FormScrollView formScroll={formScroll} maxHeight={bodyHeight}>
        <Form {...form}>
          <View className="gap-3.5 pb-1">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.agenda.event-title')}</FormLabel>
                  <FormControl>
                    <Input {...field} onChangeText={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>{t('screens.agenda.event-day')}</FormLabel>
              <DayPickerField
                value={new Date(day)}
                onChange={(next) => form.setValue('day', startOfDay(next).getTime())}
                weekdayLabels={weekdayLabels}
                locale={locale}
              />
            </FormItem>

            <FormField
              control={form.control}
              name="isAllDay"
              render={({ field }) => (
                <SettingRow
                  label={t('screens.agenda.event-all-day')}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            {!allDay ? (
            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.agenda.event-time')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="09:00"
                          keyboardType="numbers-and-punctuation"
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.agenda.event-end')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10:00"
                          keyboardType="numbers-and-punctuation"
                          {...field}
                          onChangeText={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
            </View>

            ) : null}

            <View>
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('screens.agenda.event-location')}</FormLabel>
                      <FormControl>
                        <Input {...field} onChangeText={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </View>
            </View>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('screens.agenda.event-notes')}</FormLabel>
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

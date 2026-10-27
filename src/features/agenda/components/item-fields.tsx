import { useRef } from 'react';
import type { RefObject } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';
import type { TranslateFn, TranslationKey } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { formatRecurrenceRule, recurrenceLabel } from '@/shared/libs/recurrence';
import { Choice } from '@/shared/ui/choice';
import type { ChoiceOption } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { DateField, TimeField } from '@/shared/ui/picker';
import type { FieldTime } from '@/shared/ui/picker';
import { Switch } from '@/shared/ui/switch';
import { Text } from '@/shared/ui/text';
import type { ItemForm } from '@/features/agenda/hooks/use-item-form';
import { REPEAT_CHOICES } from '@/features/agenda/constants/agenda.constant';
import { inputClock, parseClock } from '@/features/agenda/model/clock-text';
import type { DraftProblem, RepeatChoice } from '@/features/agenda/model/item-draft';
import { FormLine } from '@/features/agenda/components/form-line';
import type { ProjectOption } from '@/features/agenda/model/agenda-view';

export type ItemFieldsProps = {
  form: ItemForm;
  projects: readonly ProjectOption[];
  now: number;
  titleRef: RefObject<TextInput | null>;
};

type TimeProps = Pick<ItemFieldsProps, 'form'>;

const TITLE_LABEL = {
  event: 'screens.agenda.sheet.title-event',
  task: 'screens.agenda.sheet.title-task',
} as const satisfies Record<string, TranslationKey>;

const PROBLEM: Record<Exclude<DraftProblem, 'time'>, TranslationKey> = {
  title: 'screens.agenda.sheet.error-title',
  'title-long': 'screens.agenda.sheet.error-title-long',
  end: 'screens.agenda.sheet.error-end',
  project: 'screens.agenda.sheet.error-project',
};

const NINE = 9;

const HOUR = 60;

function useProblem(form: ItemForm) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const example = date.formatHour(NINE);
  return (...kinds: DraftProblem[]) => {
    const found = kinds.find((kind) => form.problems.includes(kind));
    if (found === 'time') return t('screens.agenda.sheet.error-time', { example });
    return found ? t(PROBLEM[found]) : undefined;
  };
}

function repeatOptions(t: TranslateFn): ChoiceOption<RepeatChoice>[] {
  return REPEAT_CHOICES.map((choice) => ({
    value: choice,
    label:
      choice === 'none'
        ? t('screens.agenda.sheet.repeat-none')
        : (recurrenceLabel(formatRecurrenceRule({ frequency: choice, interval: 1 }), t) ?? choice),
  }));
}

const hasTime = ({ kind, allDay }: ItemForm['draft']): boolean => kind === 'event' && !allDay;

const minutesOf = (text: string): number | null => (text.trim() === '' ? null : parseClock(text));

function useStart(form: ItemForm): FieldTime | undefined {
  const date = useDateFormatter();
  const { draft } = form;
  if (!hasTime(draft)) return undefined;
  return {
    value: minutesOf(draft.time),
    fallback: parseClock(date.defaultInputTime(new Date(draft.day))) ?? 0,
    onChange: (minutes) => form.change({ time: inputClock(minutes) }),
  };
}

function EndField({ form }: TimeProps) {
  const { t } = useTranslation();
  const problem = useProblem(form);
  const start = useStart(form);
  if (!start) return null;
  const endError = problem('end');
  return (
    <View>
      <TimeField
        label={t('screens.agenda.sheet.end')}
        value={minutesOf(form.draft.end)}
        fallback={(start.value ?? start.fallback) + HOUR}
        onChange={(minutes) => form.change({ end: inputClock(minutes) })}
        onClear={() => form.change({ end: '' })}
      />
      {endError ? (
        <Text variant="meta" tone="alert">
          {endError}
        </Text>
      ) : null}
    </View>
  );
}

export function ItemFields({ form, projects, now, titleRef }: ItemFieldsProps) {
  const { t } = useTranslation();
  const problem = useProblem(form);
  const placeRef = useRef<TextInput>(null);
  const start = useStart(form);
  const { draft } = form;
  const editing = form.editing !== null;
  const single = editing && form.scope === 'one';
  return (
    <View className="gap-4">
      <Field
        ref={titleRef}
        label={t(TITLE_LABEL[draft.kind])}
        value={draft.title}
        onChangeText={(title) => form.change({ title })}
        error={problem('title', 'title-long')}
        submit={
          draft.kind === 'event'
            ? { key: 'next', onSubmit: () => placeRef.current?.focus() }
            : { key: 'done', onSubmit: form.submit }
        }
      />
      {draft.kind === 'task' ? (
        <Choice
          label={t('screens.agenda.sheet.project')}
          look="field"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          value={draft.project}
          onChange={(project) => form.change({ project })}
        />
      ) : null}
      <View>
        <DateField
          label={t(start ? 'screens.agenda.sheet.starts' : 'screens.agenda.sheet.day')}
          value={draft.day}
          now={now}
          quick
          time={start}
          onChange={(day) => form.change({ day })}
        />
        {draft.kind === 'event' && !single ? (
          <FormLine
            label={t('screens.agenda.sheet.all-day')}
            trailing={
              <Switch
                value={draft.allDay}
                onValueChange={(allDay) => form.change({ allDay })}
                label={t('screens.agenda.sheet.all-day')}
              />
            }
          />
        ) : null}
        <EndField form={form} />
      </View>
      {draft.kind === 'event' ? (
        <Field
          ref={placeRef}
          label={t('screens.agenda.sheet.place')}
          value={draft.place}
          onChangeText={(place) => form.change({ place })}
          submit={{ key: 'done', onSubmit: form.submit }}
        />
      ) : null}
      {draft.kind !== 'task' && !single && !(editing && draft.kind === 'event') ? (
        <Choice
          label={t('screens.agenda.sheet.repeat')}
          look="field"
          options={repeatOptions(t)}
          value={draft.repeat}
          onChange={(repeat) => form.change({ repeat })}
        />
      ) : null}
    </View>
  );
}

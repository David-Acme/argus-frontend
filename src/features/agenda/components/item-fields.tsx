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
import { Row } from '@/shared/ui/row';
import { Switch } from '@/shared/ui/switch';
import type { ItemForm } from '@/features/agenda/hooks/use-item-form';
import { REPEATS } from '@/features/agenda/model/item-draft';
import type { DraftProblem } from '@/features/agenda/model/item-draft';
import type { RepeatChoice } from '@/features/agenda/model/reminder-repeat';
import { DayField } from '@/features/agenda/components/day-field';

export type ProjectOption = { id: string; name: string };

export type ItemFieldsProps = {
  form: ItemForm;
  projects: readonly ProjectOption[];
  now: number;
  titleRef: RefObject<TextInput | null>;
};

type TimeProps = Pick<ItemFieldsProps, 'form'> & {
  timeRef: RefObject<TextInput | null>;
  placeRef: RefObject<TextInput | null>;
};

const TITLE_LABEL = {
  reminder: 'screens.agenda.sheet.title-reminder',
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
  return REPEATS.map((choice) => ({
    value: choice,
    label:
      choice === 'none'
        ? t('screens.agenda.sheet.repeat-none')
        : (recurrenceLabel(formatRecurrenceRule({ frequency: choice, interval: 1 }), t) ?? choice),
  }));
}

const hasTime = ({ kind, allDay }: ItemForm['draft']): boolean =>
  kind === 'reminder' || (kind === 'event' && !allDay);

function TimeFields({ form, timeRef, placeRef }: TimeProps) {
  const { t } = useTranslation();
  const problem = useProblem(form);
  const endRef = useRef<TextInput>(null);
  const { draft } = form;
  const event = draft.kind === 'event';
  const onDone = form.submit;
  if (!hasTime(draft)) return null;
  return (
    <View className="gap-3">
      <Field
        ref={timeRef}
        label={t('screens.agenda.sheet.time')}
        value={draft.time}
        onChangeText={(time) => form.change({ time })}
        error={problem('time')}
        submit={
          event
            ? { key: 'next', onSubmit: () => endRef.current?.focus() }
            : { key: 'done', onSubmit: onDone }
        }
      />
      {event ? (
        <Field
          ref={endRef}
          label={t('screens.agenda.sheet.end')}
          hint={t('screens.agenda.sheet.end-hint')}
          value={draft.end}
          onChangeText={(end) => form.change({ end })}
          error={problem('end')}
          submit={{ key: 'next', onSubmit: () => placeRef.current?.focus() }}
        />
      ) : null}
    </View>
  );
}

export function ItemFields({ form, projects, now, titleRef }: ItemFieldsProps) {
  const { t } = useTranslation();
  const problem = useProblem(form);
  const timeRef = useRef<TextInput>(null);
  const placeRef = useRef<TextInput>(null);
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
          hasTime(draft)
            ? { key: 'next', onSubmit: () => timeRef.current?.focus() }
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
      <DayField day={draft.day} now={now} onChange={(day) => form.change({ day })} />
      {draft.kind === 'event' && !single ? (
        <Row
          title={t('screens.agenda.sheet.all-day')}
          trailing={
            <Switch
              value={draft.allDay}
              onValueChange={(allDay) => form.change({ allDay })}
              label={t('screens.agenda.sheet.all-day')}
            />
          }
        />
      ) : null}
      <TimeFields form={form} timeRef={timeRef} placeRef={placeRef} />
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

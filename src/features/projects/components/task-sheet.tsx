import { useRef } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';
import type { IProjectCacheRow } from '@/core/interfaces';
import type { TranslationKey } from '@/core/types';
import { useDateFormatter } from '@/shared/hooks/use-date-formatter';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Row } from '@/shared/ui/row';
import { Sheet } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { DayField } from '@/features/agenda';
import {
  LANE_LABEL,
  PRIORITY_LABEL,
  TASK_LANES,
  TASK_PRIORITIES,
} from '@/features/projects/constants/projects.constant';
import type { TaskForm } from '@/features/projects/hooks/use-task-form';
import type { TaskProblem } from '@/features/projects/model/task-draft';

export type TaskSheetProps = {
  form: TaskForm;
  projects: readonly IProjectCacheRow[];
  now: number;
};

type PartProps = Pick<TaskSheetProps, 'form' | 'now'>;

const PROBLEM: Record<TaskProblem, TranslationKey> = {
  title: 'screens.projects.sheet.error-title',
  'title-long': 'screens.projects.sheet.error-title-long',
  project: 'screens.projects.sheet.error-project',
};

function DueFields({ form, now }: PartProps) {
  const { t } = useTranslation();
  const date = useDateFormatter();
  const { due } = form.draft;
  const today = date.startOfDay(new Date(now)).getTime();
  return (
    <View>
      <Row
        title={t('screens.projects.sheet.due')}
        trailing={
          <Switch
            value={due !== null}
            onValueChange={(on) => form.change({ due: on ? today : null })}
            label={t('screens.projects.sheet.due')}
          />
        }
      />
      {due !== null ? (
        <DayField day={due} now={now} onChange={(day) => form.change({ due: day })} />
      ) : null}
    </View>
  );
}

export function TaskSheet({ form, projects, now }: TaskSheetProps) {
  const { t } = useTranslation();
  const titleRef = useRef<TextInput>(null);
  const { draft, editing } = form;
  const problem = (kind: TaskProblem) =>
    form.problems.includes(kind) ? t(PROBLEM[kind]) : undefined;
  return (
    <Sheet
      open={form.open}
      onClose={form.close}
      title={t(editing ? 'screens.projects.edit-task' : 'screens.projects.new-task')}
      variant="form"
      long
      dirty={form.dirty}
      actions={{ primary: { label: t('screens.projects.sheet.save'), onPress: form.submit } }}
      initialFocus={titleRef}>
      <View className="gap-4">
        <Field
          ref={titleRef}
          label={t('screens.projects.sheet.title')}
          value={draft.title}
          onChangeText={(title) => form.change({ title })}
          error={problem('title') ?? problem('title-long')}
          submit={{ key: 'done', onSubmit: () => void form.submit() }}
        />
        {projects.length > 1 && !editing ? (
          <Choice
            label={t('screens.projects.sheet.project')}
            look="field"
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
            value={draft.project}
            onChange={(project) => form.change({ project })}
          />
        ) : null}
        <Choice
          label={t('screens.projects.sheet.status')}
          options={TASK_LANES.map((lane) => ({ value: lane.key, label: t(LANE_LABEL[lane.key]) }))}
          value={draft.lane}
          onChange={(lane) => form.change({ lane })}
        />
        <DueFields form={form} now={now} />
        <Choice
          label={t('screens.projects.sheet.priority')}
          look="field"
          options={TASK_PRIORITIES.map((priority) => ({
            value: priority,
            label: t(PRIORITY_LABEL[priority]),
          }))}
          value={draft.priority}
          onChange={(priority) => form.change({ priority })}
        />
        {editing ? (
          <Row title={t('screens.projects.remove-task')} danger onPress={form.remove} />
        ) : null}
      </View>
    </Sheet>
  );
}

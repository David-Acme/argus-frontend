import { useRef } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Row } from '@/shared/ui/row';
import { Sheet } from '@/shared/ui/sheet';
import {
  PROJECT_STATUS_LABEL,
  PROJECT_STATUSES,
} from '@/features/projects/constants/projects.constant';
import type { ProjectForm } from '@/features/projects/hooks/use-project-form';
import type { ProjectProblem } from '@/features/projects/model/project-draft';

export type ProjectSheetProps = { form: ProjectForm; canRemove: boolean };

const PROBLEM: Record<ProjectProblem, TranslationKey> = {
  name: 'screens.projects.sheet.error-name',
  'name-long': 'screens.projects.sheet.error-name-long',
  'description-long': 'screens.projects.sheet.error-description-long',
};

export function ProjectSheet({ form, canRemove }: ProjectSheetProps) {
  const { t } = useTranslation();
  const nameRef = useRef<TextInput>(null);
  const { draft, editing } = form;
  const problem = (kind: ProjectProblem) =>
    form.problems.includes(kind) ? t(PROBLEM[kind]) : undefined;
  return (
    <Sheet
      open={form.open}
      onClose={form.close}
      title={t(editing ? 'screens.projects.edit-project' : 'screens.projects.new-project')}
      variant="form"
      long={editing !== null}
      dirty={form.dirty}
      actions={{ primary: { label: t('screens.projects.sheet.save'), onPress: form.submit } }}
      initialFocus={nameRef}>
      <View className="gap-4">
        <Field
          ref={nameRef}
          label={t('screens.projects.sheet.name')}
          placeholder={t('screens.projects.sheet.name-placeholder')}
          value={draft.name}
          onChangeText={(name) => form.change({ name })}
          error={problem('name') ?? problem('name-long')}
          submit={{ key: 'done', onSubmit: () => void form.submit() }}
        />
        <Field
          kind="multiline"
          label={t('screens.projects.sheet.description')}
          value={draft.description}
          onChangeText={(description) => form.change({ description })}
          error={problem('description-long')}
        />
        {editing ? (
          <Choice
            label={t('screens.projects.sheet.status')}
            look="field"
            options={PROJECT_STATUSES.map((status) => ({
              value: status,
              label: t(PROJECT_STATUS_LABEL[status]),
            }))}
            value={draft.status}
            onChange={(status) => form.change({ status })}
          />
        ) : null}
        {editing && canRemove ? (
          <Row title={t('screens.projects.delete-project')} danger onPress={form.remove} />
        ) : null}
      </View>
    </Sheet>
  );
}

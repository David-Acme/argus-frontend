import { useRef } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';
import type { TranslationKey } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Choice } from '@/shared/ui/choice';
import { FilterChip } from '@/shared/ui/chip';
import { Sheet } from '@/shared/ui/sheet';
import type { ItemForm } from '@/features/agenda/hooks/use-item-form';
import type { AgendaKind } from '@/features/agenda/model/agenda-items';
import { KIND_LABEL } from '@/features/agenda/model/agenda-lines';
import type { EditScope } from '@/features/agenda/model/item-draft';
import { ItemFields } from '@/features/agenda/components/item-fields';
import type { ProjectOption } from '@/features/agenda/components/item-fields';

export type ItemSheetProps = {
  form: ItemForm;
  kinds: readonly AgendaKind[];
  projects: readonly ProjectOption[];
  now: number;
};

type KindsProps = Pick<ItemSheetProps, 'form' | 'kinds' | 'projects'>;

const NEW_TITLE: Record<AgendaKind, TranslationKey> = {
  reminder: 'screens.agenda.sheet.new-reminder',
  event: 'screens.agenda.sheet.new-event',
  task: 'screens.agenda.sheet.new-task',
};

const EDIT_TITLE: Record<AgendaKind, TranslationKey> = {
  reminder: 'screens.agenda.sheet.edit-reminder',
  event: 'screens.agenda.sheet.edit-event',
  task: 'screens.agenda.sheet.edit-event',
};

function Kinds({ form, kinds, projects }: KindsProps) {
  const { t } = useTranslation();
  if (kinds.length < 2) return null;
  return (
    <View
      role="tablist"
      aria-label={t('screens.agenda.sheet.kind')}
      className="flex-row flex-wrap gap-2">
      {kinds.map((kind) => (
        <FilterChip
          key={kind}
          size="view"
          label={t(KIND_LABEL[kind])}
          selected={form.draft.kind === kind}
          onPress={() =>
            form.change({ kind, project: form.draft.project || (projects[0]?.id ?? '') })
          }
        />
      ))}
    </View>
  );
}

export function ItemSheet({ form, kinds, projects, now }: ItemSheetProps) {
  const { t } = useTranslation();
  const titleRef = useRef<TextInput>(null);
  const { draft, editing } = form;
  const title = t(editing ? EDIT_TITLE[draft.kind] : NEW_TITLE[draft.kind]);
  return (
    <Sheet
      open={form.open}
      onClose={form.close}
      title={title}
      variant="form"
      long={draft.kind === 'event'}
      dirty={form.dirty}
      actions={{ primary: { label: t('screens.agenda.sheet.save'), onPress: form.submit } }}
      initialFocus={titleRef}
      testID="agenda-item-sheet">
      <View className="gap-4">
        {editing ? null : <Kinds form={form} kinds={kinds} projects={projects} />}
        {form.scopes.length > 0 ? (
          <Choice<EditScope>
            label={t('screens.agenda.sheet.scope')}
            options={form.scopes.map((scope) => ({
              value: scope,
              label: t(
                scope === 'one'
                  ? 'screens.agenda.sheet.scope-one'
                  : 'screens.agenda.sheet.scope-series'
              ),
            }))}
            value={form.scope}
            onChange={form.setScope}
          />
        ) : null}
        <ItemFields form={form} projects={projects} now={now} titleRef={titleRef} />
      </View>
    </Sheet>
  );
}

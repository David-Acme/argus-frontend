import { useRef } from 'react';
import { View } from 'react-native';
import type { TextInput } from 'react-native';
import type { UserRole } from '@/core/types';
import { useTranslation } from '@/shared/hooks/use-translation';
import { roleLabelOf } from '@/shared/libs/role-label';
import { Choice } from '@/shared/ui/choice';
import { Field } from '@/shared/ui/field';
import { Sheet } from '@/shared/ui/sheet';
import type { PersonForm } from '@/features/people/hooks/use-person-form';

export type PersonSheetProps = { form: PersonForm; selfId: string };

const ROLES: readonly UserRole[] = ['owner', 'resident', 'guard', 'guest'];

export function PersonSheet({ form, selfId }: PersonSheetProps) {
  const { t } = useTranslation();
  const nameRef = useRef<TextInput>(null);
  const lastRef = useRef<TextInput>(null);
  const { draft } = form;
  const self = form.editing?.id === selfId;
  return (
    <Sheet
      open={form.open}
      onClose={form.close}
      title={t('screens.users.edit-user')}
      variant="form"
      dirty={form.dirty}
      actions={{ primary: { label: t('common.save'), onPress: form.submit } }}
      initialFocus={nameRef}>
      <View className="gap-4">
        <Field
          ref={nameRef}
          label={t('screens.users.name')}
          value={draft.name}
          onChangeText={(name) => form.change({ name })}
          error={form.missingName ? t('screens.users.name-missing') : undefined}
          submit={{ key: 'next', onSubmit: () => lastRef.current?.focus() }}
        />
        <Field
          ref={lastRef}
          label={t('screens.users.last-name')}
          value={draft.lastName}
          onChangeText={(lastName) => form.change({ lastName })}
          submit={{ key: 'done', onSubmit: () => void form.submit() }}
        />
        {self ? null : (
          <Choice
            label={t('screens.users.role')}
            look="field"
            options={ROLES.map((role) => ({ value: role, label: roleLabelOf(role, t) }))}
            value={draft.role}
            onChange={form.pickRole}
            caption={
              form.pausedBy
                ? t('screens.users.role-module-off', { module: form.pausedBy })
                : undefined
            }
          />
        )}
      </View>
    </Sheet>
  );
}

import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { IUserManagementUpdate } from '@/core/interfaces';
import type { UserRole } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { runOptimistic } from '@/shared/libs/optimistic-action';
import { userManagementService } from '@/features/people/services/user-management.service';
import {
  type ManagedUserDialogProps,
  roleOptions,
} from '@/features/people/components/user-options';

export function ManagedUserDialog({ user, open, onOpenChange, onSaved }: ManagedUserDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<UserRole>(user.role);
  const options = useMemo(() => roleOptions(t), [t]);

  const save = () => {
    if (!name.trim()) return;
    const values: IUserManagementUpdate = { name: name.trim(), lastName: lastName.trim(), role };
    onOpenChange(false);
    void runOptimistic({
      intents: [{ table: 'user', kind: 'update', recordId: user.id, values }],
      call: () => userManagementService.update(Number(user.id), values),
      success: t('screens.users.user-saved'),
    }).then((response) => {
      if (response) onSaved();
    });
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.users.edit-user')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button disabled={!name.trim()} onPress={save}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3.5 pb-1">
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.users.name')}
          </Text>
          <Input
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            onSubmitEditing={save}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.users.last-name')}
          </Text>
          <Input
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            onSubmitEditing={save}
          />
        </View>
        <View className="gap-1.5">
          <Text variant="caption" className="text-foreground-secondary">
            {t('screens.users.role')}
          </Text>
          <AdaptiveSelect
            options={options}
            value={role}
            onChange={setRole}
            title={t('screens.users.role')}
            closeLabel={t('common.close')}
            searchPlaceholder={t('screens.home.search-placeholder')}
            emptyLabel={t('screens.users.no-results')}
            trigger={<SelectField label={options.find((option) => option.value === role)?.label} />}
          />
        </View>
      </View>
    </AdaptiveDialog>
  );
}

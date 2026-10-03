

import { userManagementService } from '@/core/services/user-management.service';

import type { UserRole } from '@/core/types';

import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { AdaptiveSelect } from '@/shared/components/ui/adaptive-select';
import { Button } from '@/shared/components/ui/button';

import { Input } from '@/shared/components/ui/input';

import { SelectField } from '@/shared/components/ui/select-field';
import { Text } from '@/shared/components/ui/text';

import { useTranslation } from '@/shared/hooks/use-translation';

import { toast } from '@/shared/libs/toast';

import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { toastServiceError } from '@/shared/libs/service-error';
import { type ManagedUserDialogProps, roleOptions } from './user-options';

export function ManagedUserDialog({ user, open, onOpenChange, onSaved }: ManagedUserDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [lastName, setLastName] = useState(user.lastName);
  const [role, setRole] = useState<UserRole>(user.role);
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => roleOptions(t), [t]);

  const save = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    const response = await userManagementService.update(user.id, {
      name: name.trim(),
      lastName: lastName.trim(),
      role,
    });
    setSaving(false);
    if (!response.ok) {
      toastServiceError(response.errors);
      return;
    }
    onOpenChange(false);
    await onSaved();
    toast.success(t('screens.users.user-saved'));
  }, [lastName, name, onOpenChange, onSaved, role, t, user]);

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('screens.users.edit-user')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" disabled={saving} onPress={() => onOpenChange(false)}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button loading={saving} disabled={!name.trim()} onPress={save}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-3.5 pb-1">
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.name')}</Text>
          <Input value={name} onChangeText={setName} autoCapitalize="words" />
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.last-name')}</Text>
          <Input value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        </View>
        <View className="gap-1.5">
          <Text className="text-foreground-secondary text-sm">{t('screens.users.role')}</Text>
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


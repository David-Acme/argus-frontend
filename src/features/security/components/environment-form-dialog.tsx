import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { GuardEnvironment, GuardEnvironmentCreate, GuardEnvironmentKind } from '@/core/types';
import { AdaptiveDialog } from '@/shared/components/ui/adaptive-dialog';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Input } from '@/shared/components/ui/input';
import { Text } from '@/shared/components/ui/text';
import { ENVIRONMENT_KIND_ICONS, ENVIRONMENT_KINDS, ENVIRONMENT_NAME_MAX } from '@/features/security/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { cn } from '@/shared/libs/utils';

type EnvironmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environment?: GuardEnvironment | null;
  onSubmit: (body: GuardEnvironmentCreate) => Promise<boolean>;
};

const tileHover = Platform.select({ web: 'hover:bg-surface-secondary/70', default: '' });

export function EnvironmentFormDialog({ open, onOpenChange, environment, onSubmit }: EnvironmentFormDialogProps) {
  const { t } = useTranslation();
  const { isCompact } = useWindowClass();
  const [name, setName] = useState(environment?.name ?? '');
  const [kind, setKind] = useState<GuardEnvironmentKind>(environment?.kind ?? 'home');
  const [saving, setSaving] = useState(false);
  const trimmed = name.trim();

  const submit = async () => {
    if (trimmed.length === 0 || saving) return;
    setSaving(true);
    const saved = await onSubmit({ name: trimmed, kind });
    setSaving(false);
    if (saved) onOpenChange(false);
  };

  return (
    <AdaptiveDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={submit}
      title={environment ? t('screens.security.environments.form-edit') : t('screens.security.environments.form-new')}
      closeLabel={t('common.close')}
      footer={
        <>
          <Button variant="outline" onPress={() => onOpenChange(false)} disabled={saving}>
            <Text>{t('common.cancel')}</Text>
          </Button>
          <Button onPress={submit} loading={saving} disabled={trimmed.length === 0}>
            <Text>{t('common.save')}</Text>
          </Button>
        </>
      }>
      <View className="gap-5">
        <View className="gap-1.5">
          <Text variant="label">{t('screens.security.environments.name')}</Text>
          <Input
            value={name}
            onChangeText={setName}
            placeholder={t('screens.security.environments.name-placeholder')}
            maxLength={ENVIRONMENT_NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={submit}
            autoFocus={environment == null}
          />
        </View>
        <View className="gap-2">
          <Text variant="label">{t('screens.security.environments.kind')}</Text>
          <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
            {ENVIRONMENT_KINDS.map((value) => {
              const active = kind === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityHint={t(`screens.security.environments.kind-hint.${value}`)}
                  onPress={() => setKind(value)}
                  className={cn(
                    'min-h-12 flex-row items-center gap-2 rounded-2xl border px-3 py-2 active:opacity-80',
                    isCompact ? 'basis-[47%] grow' : 'basis-[31%] grow',
                    active ? 'bg-interactive border-interactive' : cn('bg-card border-border-subtle', tileHover)
                  )}>
                  <Icon
                    name={ENVIRONMENT_KIND_ICONS[value]}
                    className={cn('size-4', active ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
                  />
                  <Text
                    variant="label"
                    numberOfLines={1}
                    className={cn('flex-1', active ? 'text-foreground-on-interactive' : 'text-foreground')}>
                    {t(`screens.security.environments.kinds.${value}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text variant="caption" className="px-1">
            {t(`screens.security.environments.kind-hint.${kind}`)}
          </Text>
        </View>
      </View>
    </AdaptiveDialog>
  );
}

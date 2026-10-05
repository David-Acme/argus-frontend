import { View } from 'react-native';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useBiometricErase } from '@/features/people/hooks/use-biometric-erase';

type BiometricEraseRowProps = {
  userId: number;
  name: string;
};

export function BiometricEraseRow({ userId, name }: BiometricEraseRowProps) {
  const { t } = useTranslation();
  const { erase, pending } = useBiometricErase();

  return (
    <View className="bg-surface-secondary flex-row items-center gap-3 rounded-2xl px-4 py-3">
      <Icon name="scan-face" className="text-foreground-secondary size-5" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{t('screens.users.biometrics.title')}</Text>
        <Text variant="caption">
          {pending ? t('screens.users.biometrics.erasing') : t('screens.users.biometrics.hint')}
        </Text>
      </View>
      <Button
        variant="ghost"
        size="sm"
        loading={pending}
        disabled={pending}
        accessibilityLabel={t('screens.users.biometrics.confirm-title', { name })}
        onPress={() => void erase({ userId, name })}>
        <Text className="text-error-strong">{t('screens.users.biometrics.erase')}</Text>
      </Button>
    </View>
  );
}

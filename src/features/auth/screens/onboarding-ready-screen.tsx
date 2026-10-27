import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useAuthStore } from '@/core/stores';
import { useDevicePermissions } from '@/shared/hooks/use-device-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Presence } from '@/shared/ui/presence';
import { Text } from '@/shared/ui/text';
import { useModuleCatalog } from '@/features/modules';
import { chosenModuleIds } from '@/features/privacy';
import { InfoRows } from '@/features/auth/components/info-rows';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { useOnboardingLayout } from '@/features/auth/hooks/use-onboarding-layout';
import { knownName } from '@/features/auth/model/person-name';
import { readyRowsOf } from '@/features/auth/model/ready-rows';

export default function OnboardingReadyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { hero } = useOnboardingLayout();
  const name = useAuthStore((state) => knownName(state.user?.name));
  const catalog = useModuleCatalog();
  const { permissions } = useDevicePermissions('onboarding');
  const alerts = permissions.some(({ id, granted }) => id === 'notifications' && granted);
  const rows = readyRowsOf({ modules: chosenModuleIds(catalog), alerts });
  return (
    <OnboardingFrame
      footer={
        <Button
          variant="primary"
          block
          label={t('screens.welcome.ready.home')}
          onPress={() => router.replace('/')}
        />
      }>
      <View className="mt-8 items-center gap-2">
        <Presence
          state="happy"
          size={hero}
          accessibilityLabel={t('screens.welcome.estela-label')}
        />
        <Text variant="heroCompact" heading={1} align="center">
          {name
            ? t('screens.welcome.ready.title', { name })
            : t('screens.welcome.ready.title-plain')}
        </Text>
        <Text variant="body" tone="2" align="center">
          {t('screens.welcome.ready.lead')}
        </Text>
      </View>
      <InfoRows rows={rows} />
      <View className="min-h-6 flex-1" />
    </OnboardingFrame>
  );
}

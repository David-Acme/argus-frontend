import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { PermissionList } from '@/shared/components/ui/permission-list';
import { Text } from '@/shared/components/ui/text';
import { IS_NATIVE } from '@/shared/constants';
import { useDevicePermissions } from '@/shared/hooks/use-device-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { flowOf, nextHref } from '@/features/auth/model/onboarding-flow';

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ flow?: string; mode?: string }>();
  const flow = flowOf(params);
  const { permissions, request } = useDevicePermissions('onboarding');
  const next = nextHref(flow, 'permissions', { native: IS_NATIVE });

  const goOn = useCallback(() => router.replace(next ?? '/'), [next, router]);

  if (!IS_NATIVE) return <Redirect href="/" />;

  return (
    <View className="bg-background flex-1">
      <View
        className="w-full max-w-xl gap-6 self-center px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, flex: 1 }}>
        <OnboardingSteps flow={flow} step="permissions" />
        <View className="gap-3">
          <View className="bg-accent-soft size-14 items-center justify-center rounded-3xl">
            <Icon name="bell" className="text-accent-strong size-7" />
          </View>
          <Text variant="micro" className="font-semibold tracking-wide uppercase">
            {t('screens.welcome.permissions.eyebrow')}
          </Text>
          <Text variant="title">{t('screens.welcome.permissions.title')}</Text>
          <Text variant="body" className="text-foreground-secondary">
            {t('screens.welcome.permissions.intro')}
          </Text>
        </View>

        <PermissionList permissions={permissions} onRequest={request} />

        <View className="mt-auto gap-3">
          <Button size="lg" onPress={goOn}>
            <Text>{t('screens.welcome.permissions.continue')}</Text>
          </Button>
          <Button variant="ghost" onPress={goOn}>
            <Text>{t('screens.welcome.permissions.later')}</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

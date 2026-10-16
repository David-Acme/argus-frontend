import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pushService } from '@/core/services/push';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { IS_ANDROID, IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { flowOf, nextHref } from '@/features/auth/model/onboarding-flow';
import type { IconName } from '@/core/types';

type PermissionRowProps = {
  icon: IconName;
  title: string;
  detail: string;
  granted: boolean;
  allowLabel: string;
  statusLabel: string;
  onAllow: () => void;
};

function PermissionRow({ icon, title, detail, granted, allowLabel, statusLabel, onAllow }: PermissionRowProps) {
  return (
    <View className="bg-card border-border flex-row items-center gap-3 rounded-2xl border p-4">
      <View className="bg-accent-soft size-11 items-center justify-center rounded-2xl">
        <Icon name={icon} className="text-accent-strong size-5" />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label">{title}</Text>
        <Text variant="caption" className="text-foreground-secondary">
          {detail}
        </Text>
        <Text variant="micro" className={granted ? 'text-success' : 'text-warning-strong'}>
          {statusLabel}
        </Text>
      </View>
      {granted ? null : (
        <Button size="sm" onPress={onAllow}>
          <Text>{allowLabel}</Text>
        </Button>
      )}
    </View>
  );
}

export default function OnboardingPermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ flow?: string; mode?: string }>();
  const flow = flowOf(params);
  const [notifications, setNotifications] = useState(false);
  const [exact, setExact] = useState(false);
  const next = nextHref(flow, 'permissions', { native: IS_NATIVE });

  const refresh = useCallback(async () => {
    setNotifications(await pushService.notificationsPermitted());
    setExact(pushService.exactAlarmsAllowed());
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const allowNotifications = useCallback(async () => {
    setNotifications(await pushService.requestNotificationsPermission());
  }, []);

  const goOn = useCallback(() => router.replace(next ?? '/'), [next, router]);

  if (!IS_NATIVE) return <Redirect href="/" />;

  const exactNeeded = IS_ANDROID;

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

        <View className="gap-3">
          <PermissionRow
            icon="bell"
            title={t('screens.welcome.permissions.notifications')}
            detail={t('screens.welcome.permissions.notifications-detail')}
            granted={notifications}
            allowLabel={t('screens.welcome.permissions.allow')}
            statusLabel={notifications ? t('screens.welcome.permissions.granted') : t('screens.welcome.permissions.pending')}
            onAllow={() => void allowNotifications()}
          />
          {exactNeeded ? (
            <PermissionRow
              icon="alarm-clock"
              title={t('screens.welcome.permissions.exact')}
              detail={t('screens.welcome.permissions.exact-detail')}
              granted={exact}
              allowLabel={t('screens.welcome.permissions.allow')}
              statusLabel={exact ? t('screens.welcome.permissions.granted') : t('screens.welcome.permissions.pending')}
              onAllow={() => pushService.openExactAlarmSettings()}
            />
          ) : null}
        </View>

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

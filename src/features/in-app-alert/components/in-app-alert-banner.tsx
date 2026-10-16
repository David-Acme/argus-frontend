import { Linking, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useInAppAlertStore } from '@/core/stores/in-app-alert.store';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

const NORMAL_ALERT_MS = 6000;

export function InAppAlertBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const alert = useInAppAlertStore((state) => state.alert);
  const dismiss = useInAppAlertStore((state) => state.dismiss);

  useEffect(() => {
    if (!alert || alert.critical) return;
    const timer = setTimeout(dismiss, NORMAL_ALERT_MS);
    return () => clearTimeout(timer);
  }, [alert, dismiss]);

  if (!alert) return null;

  const open = () => {
    dismiss();
    if (alert.deepLink) void Linking.openURL(alert.deepLink);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      accessibilityRole="alert"
      accessibilityLiveRegion={alert.critical ? 'assertive' : 'polite'}
      className="absolute inset-x-0 px-4"
      style={{ top: insets.top + 8 }}>
      <View className="bg-card gap-2 rounded-2xl border border-border p-4 shadow-lg shadow-black/15">
        <Text variant="label" className={alert.critical ? 'text-error-strong' : 'text-foreground-secondary'}>
          {alert.title}
        </Text>
        <Text>{alert.body}</Text>
        <View className="flex-row justify-end gap-2">
          <Button variant="outline" size="sm" onPress={dismiss}>
            <Text>{t('common.close')}</Text>
          </Button>
          {alert.deepLink ? (
            <Button size="sm" onPress={open}>
              <Text>{t('common.alert-view')}</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

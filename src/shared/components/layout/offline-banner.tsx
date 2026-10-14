import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useWatchdogNotice } from '@/shared/components/layout/use-watchdog-notice';
import { NET_ROUTE_STATUS_VIEWS } from '@/shared/constants';
import { useRelayRefusalAlert, useRouteStatus } from '@/shared/hooks/use-route-status';
import { useTranslation } from '@/shared/hooks/use-translation';

const lastHeardLabel = (at: number, language: string): string => {
  const heard = new Date(at);
  const clock = heard.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
  if (heard.toDateString() === new Date().toDateString()) return clock;
  return `${heard.toLocaleDateString(language, { weekday: 'short', day: 'numeric' })} ${clock}`;
};

export function OfflineBanner() {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const offline = useOfflineNotice();
  const watchdog = useWatchdogNotice();
  const routeStatus = useRouteStatus();
  useRelayRefusalAlert();
  const route =
    routeStatus === 'unreachable' || routeStatus === 'remote-unavailable' ? NET_ROUTE_STATUS_VIEWS[routeStatus] : null;
  const [retrying, setRetrying] = useState(false);

  if (!offline) return null;

  const silent = watchdog.kind === 'silent';
  const title = silent
    ? t('common.watchdog.banner-title', { time: lastHeardLabel(watchdog.since, language) })
    : t(route?.title ?? 'common.offline.title');
  const description = silent
    ? t('common.watchdog.banner-description')
    : t(route?.detail ?? 'common.offline.description');
  const icon = !silent && route ? route.icon : 'wifi-off';

  const retry = async () => {
    setRetrying(true);
    await synchronizeService.ensureConnected();
    setRetrying(false);
  };

  return (
    <View className="items-center px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
      <Animated.View
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(180)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="bg-card border-border w-full max-w-[520px] flex-row items-center gap-3 rounded-2xl border py-2 pr-2 pl-4 shadow-md shadow-black/10">
        <Icon name={icon} className="text-warning-strong size-5" />
        <View className="min-w-0 flex-1">
          <Text variant="label">{title}</Text>
          <Text variant="caption">{description}</Text>
        </View>
        <Button size="sm" variant="ghost" loading={retrying} onPress={retry}>
          <Text>{t('common.retry')}</Text>
        </Button>
      </Animated.View>
    </View>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { useOfflineToastStore, useToastStore } from '@/core/stores';
import { Icon } from '@/shared/components/ui/icon';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useWatchdogNotice } from '@/shared/components/layout/use-watchdog-notice';
import { NET_ROUTE_STATUS_VIEWS } from '@/shared/constants';
import { useRelayRefusalAlert, useRouteStatus } from '@/shared/hooks/use-route-status';
import { useTranslation } from '@/shared/hooks/use-translation';
import { offlineTransition, type OfflineView } from '@/shared/components/layout/offline-transition';
import { toast } from '@/shared/libs/toast';

const lastHeardLabel = (at: number, language: string): string => {
  const heard = new Date(at);
  const clock = heard.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
  if (heard.toDateString() === new Date().toDateString()) return clock;
  return `${heard.toLocaleDateString(language, { weekday: 'short', day: 'numeric' })} ${clock}`;
};

const retry = () => {
  void synchronizeService.ensureConnected();
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
  const toastId = useOfflineToastStore((state) => state.toastId);
  const toastOpen = useToastStore((state) => state.items.some((item) => item.id === toastId));

  const view = useMemo<OfflineView | null>(() => {
    if (!offline) return null;
    if (watchdog.kind === 'silent') {
      return {
        key: 'watchdog',
        title: t('common.watchdog.banner-title', { time: lastHeardLabel(watchdog.since, language) }),
        description: t('common.watchdog.banner-description'),
        icon: 'wifi-off',
      };
    }
    return {
      key: route && routeStatus ? routeStatus : 'offline',
      title: t(route?.title ?? 'common.offline.title'),
      description: t(route?.detail ?? 'common.offline.description'),
      icon: route?.icon ?? 'wifi-off',
    };
  }, [offline, watchdog, route, routeStatus, t, language]);

  const previous = useRef<OfflineView | null>(null);

  useEffect(() => {
    const transition = offlineTransition(previous.current, view);
    previous.current = view;
    if (transition === 'none') return;
    const store = useOfflineToastStore.getState();
    if (store.toastId) toast.dismiss(store.toastId);
    if (transition === 'recovered') {
      store.setToastId(null);
      toast.success(t('common.offline.reconnected'));
      return;
    }
    if (view) store.setToastId(toast.warning(view.title, view.description, { label: t('common.retry'), onPress: retry }));
  }, [view, t]);

  if (!view || toastOpen) return null;

  const reopen = () => {
    useOfflineToastStore
      .getState()
      .setToastId(toast.warning(view.title, view.description, { label: t('common.retry'), onPress: retry }));
  };

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      className="absolute right-4"
      style={{ top: insets.top + 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.title}
        hitSlop={8}
        onPress={reopen}
        className="bg-card border-border size-10 items-center justify-center rounded-full border shadow-sm shadow-black/10 active:opacity-80">
        <Icon name={view.icon} className="text-warning-strong size-5" />
      </Pressable>
    </Animated.View>
  );
}

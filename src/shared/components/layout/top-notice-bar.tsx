import { useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { useOfflineToastStore, useToastStore } from '@/core/stores';
import type { ToastItem } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useWatchdogNotice } from '@/shared/components/layout/use-watchdog-notice';
import { offlineTransition, type OfflineView } from '@/shared/components/layout/offline-transition';
import { NET_ROUTE_STATUS_VIEWS } from '@/shared/constants';
import { useRelayRefusalAlert, useRouteStatus } from '@/shared/components/layout/use-route-status';
import { useTranslation } from '@/shared/hooks/use-translation';
import { toast } from '@/shared/libs/toast';
import { Button } from '@/shared/ui/button';
import { Text } from '@/shared/ui/text';

type TopNoticeBarProps = { children: ReactNode };

type OfflinePillProps = { view: OfflineView; retryLabel: string };

type ParkedDotProps = { item: ToastItem; onOpen: (id: string) => void };

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

const lastHeardLabel = (at: number, language: string): string => {
  const heard = new Date(at);
  const clock = heard.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });
  if (heard.toDateString() === new Date().toDateString()) return clock;
  return `${heard.toLocaleDateString(language, { weekday: 'short', day: 'numeric' })} ${clock}`;
};

const retry = () => {
  void synchronizeService.ensureConnected();
};

function useOfflineView(): OfflineView | null {
  const { t, language } = useTranslation();
  const offline = useOfflineNotice();
  const watchdog = useWatchdogNotice();
  const routeStatus = useRouteStatus();
  useRelayRefusalAlert();
  const route =
    routeStatus === 'unreachable' || routeStatus === 'remote-unavailable'
      ? NET_ROUTE_STATUS_VIEWS[routeStatus]
      : null;
  return useMemo<OfflineView | null>(() => {
    if (!offline) return null;
    if (watchdog.kind === 'silent') {
      return {
        key: 'watchdog',
        title: t('common.watchdog.banner-title', {
          time: lastHeardLabel(watchdog.since, language),
        }),
        description: t('common.watchdog.banner-description'),
        icon: 'wifi-off',
      };
    }
    return {
      key: route && routeStatus ? routeStatus : 'offline',
      title: t(route?.title ?? 'common.offline.title'),
      description: t(route?.detail ?? 'common.offline.description'),
      icon: 'wifi-off',
    };
  }, [offline, watchdog, route, routeStatus, t, language]);
}

function OfflinePill({ view, retryLabel }: OfflinePillProps) {
  const open = () => {
    const store = useOfflineToastStore.getState();
    if (store.toastId) toast.dismiss(store.toastId);
    store.setToastId(toast.warning(view.title, view.description));
  };
  return (
    <View className="bg-surface border-line min-h-target-min min-w-0 flex-1 flex-row items-center gap-2 rounded-full border pr-1 pl-4">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.title}
        onPress={open}
        className="min-w-0 flex-1 flex-row items-center gap-2">
        <Icon name={view.icon} className="text-warning-strong size-4" />
        <View className="min-w-0 flex-1">
          <Text variant="label" numberOfLines={1}>
            {view.title}
          </Text>
        </View>
      </Pressable>
      <Button compact variant="ghost" label={retryLabel} onPress={retry} />
    </View>
  );
}

function ParkedDot({ item, onOpen }: ParkedDotProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      hitSlop={8}
      onPress={() => onOpen(item.id)}
      className="bg-card border-border size-10 items-center justify-center rounded-full border shadow-sm shadow-black/10 active:opacity-80">
      <Icon name="triangle-alert" className="text-error-strong size-5" />
    </Pressable>
  );
}

export function TopNoticeBar({ children }: TopNoticeBarProps) {
  const { t } = useTranslation();
  const insets = useContext(SafeAreaInsetsContext) ?? NO_INSETS;
  const view = useOfflineView();
  const parked = useToastStore((state) => state.parked);
  const reopenParked = useToastStore((state) => state.reopenParked);
  const previous = useRef<OfflineView | null>(null);
  const nextParked = parked[0];
  const shown = view !== null || nextParked !== undefined;
  const below = shown ? { ...insets, top: 0 } : insets;
  const row = { paddingTop: insets.top + 4 };

  useEffect(() => {
    const transition = offlineTransition(previous.current, view);
    previous.current = view;
    if (transition === 'none') return;
    const store = useOfflineToastStore.getState();
    if (store.toastId) toast.dismiss(store.toastId);
    store.setToastId(null);
  }, [view]);

  return (
    <>
      {shown ? (
        <View className="flex-row items-center justify-end gap-2 px-4 pb-1" style={row}>
          {view ? <OfflinePill view={view} retryLabel={t('common.retry')} /> : null}
          {nextParked ? <ParkedDot item={nextParked} onOpen={reopenParked} /> : null}
        </View>
      ) : null}
      <SafeAreaInsetsContext.Provider value={below}>{children}</SafeAreaInsetsContext.Provider>
    </>
  );
}

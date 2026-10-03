import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type {
  ICameraEventCacheRow,
  ICameraListCacheRow,
  IDashboardCameraCacheRow,
} from '@/core/interfaces';
import { useAuthStore } from '@/core/stores';
import type { CameraRecordMode } from '@/core/types';
import {
  CameraCardGrid,
  CameraForm,
  CameraSummary,
  RecentDetections,
  cameraStatusOf,
  type CameraSummaryCounts,
} from '@/shared/components/cameras';
import { ActivityCard, DashboardIconButton } from '@/shared/components/dashboard';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { EmptyState, ScreenShell } from '@/shared/components/layout';

const SUMMARY_PANEL_WIDTH = 280;

function isRecordMode(value: string | undefined): value is CameraRecordMode {
  return value === 'events' || value === 'continuous';
}

export default function CamerasScreen() {
  const router = useRouter();
  const { summary, activityLevels } = useDashboardData();
  const recentEvents = useViewCacheRows<ICameraEventCacheRow>(VIEW_CACHE_KEYS.cameraEvents);
  const { t } = useTranslation();
  const { isCompact, isExpanded } = useWindowClass();
  const authStatus = useAuthStore((state) => state.status);
  const { can, role } = usePermissions();
  const bottomInset = useBottomNavInset();
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  const [formOpen, setFormOpen] = useState(newParam === 'camera');

  const items = useViewCacheRows<ICameraListCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const dashboardCameras = useViewCacheRows<IDashboardCameraCacheRow>(VIEW_CACHE_KEYS.dashboardCameras);
  const canCreate = can('camera', 'create');

  const recordModes = useMemo(() => {
    const modes = new Map<string, CameraRecordMode>();
    for (const camera of dashboardCameras) {
      if (isRecordMode(camera.recordMode)) modes.set(camera.id, camera.recordMode);
    }
    return modes;
  }, [dashboardCameras]);

  const counts = useMemo<CameraSummaryCounts>(() => {
    const next: CameraSummaryCounts = {
      total: items.length,
      online: 0,
      offline: 0,
      disabled: 0,
      zones: 0,
      events: 0,
      continuous: 0,
    };
    for (const item of items) {
      next[cameraStatusOf(item)] += 1;
      next.zones += item.zones;
      const mode = recordModes.get(item.id);
      if (mode) next[mode] += 1;
    }
    return next;
  }, [items, recordModes]);

  const openCamera = useCallback((id: string) => router.push(`/cameras/${id}`), [router]);
  const openForm = useCallback(() => setFormOpen(true), []);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  const detections = (
    <RecentDetections
      title={t('screens.cameras.detections.title')}
      emptyLabel={t('screens.cameras.detections.empty')}
      emptyHint={t('screens.cameras.detections.empty-hint')}
      events={recentEvents}
      className={isExpanded ? 'flex-1' : 'min-h-56'}
    />
  );

  return (
    <ScreenShell
      title={t('screens.cameras.title')}
      subtitle={t('screens.cameras.subtitle', {
        online: String(counts.online),
        total: String(items.length),
      })}
      onBack={() => router.back()}
      action={
        canCreate ? (
          <DashboardIconButton icon="plus" label={t('screens.cameras.connect')} onPress={openForm} />
        ) : null
      }>
      {items.length === 0 ? (
        <View className="flex-1">
          <EmptyState
            icon="video"
            title={t('screens.cameras.empty')}
            hint={t('screens.cameras.empty-hint')}
            action={
              canCreate ? (
                <Button onPress={openForm}>
                  <Text>{t('screens.cameras.connect')}</Text>
                </Button>
              ) : null
            }
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset }}>
          <View className={isExpanded ? 'flex-row items-stretch gap-6' : 'gap-4'}>
            <View className="gap-4" style={isExpanded ? { width: SUMMARY_PANEL_WIDTH } : undefined}>
              <CameraSummary counts={counts} layout={isExpanded ? 'panel' : 'strip'} compact={isCompact} />
              {isExpanded ? detections : null}
            </View>
            <View className={isExpanded ? 'min-w-0 flex-1 gap-4' : 'gap-4'}>
              <CameraCardGrid
                items={items}
                recordModes={recordModes}
                onSelect={openCamera}
                createLabel={t('screens.cameras.connect')}
                createHint={t('screens.cameras.add-tile-hint')}
                onCreate={canCreate ? openForm : undefined}
              />
              <ActivityCard
                title={t('screens.home.activity-events', { count: String(summary.eventsCurrent) })}
                delta={String(summary.eventsCurrent)}
                direction="flat"
                levels={activityLevels}
                action={role === 'owner' ? t('screens.home.activity-action') : undefined}
                onAction={() => router.push('/security')}
                className={isExpanded ? 'flex-1' : undefined}
              />
              {isExpanded ? null : detections}
            </View>
          </View>
        </ScrollView>
      )}

      <CameraForm open={formOpen} onOpenChange={setFormOpen} />
    </ScreenShell>
  );
}

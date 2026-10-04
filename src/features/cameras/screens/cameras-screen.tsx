import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { ICameraEventCacheRow } from '@/core/interfaces';
import { CameraCardGrid } from '@/features/cameras/components/camera-card-grid';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { CameraSummary, type CameraSummaryCounts } from '@/features/cameras/components/camera-summary';
import { RecentDetections } from '@/features/cameras/components/recent-detections';
import { cameraStatusOf } from '@/features/cameras/components/camera-card';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { useCameraThumbnails } from '@/features/cameras/hooks/use-camera-thumbnails';
import { ActivityCard } from '@/shared/components/activity/activity-card';
import { IconButton } from '@/shared/components/ui/icon-button';
import { useDashboardData } from '@/shared/hooks/use-dashboard-data';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';

const SUMMARY_PANEL_WIDTH = 280;

export default function CamerasScreen() {
  const router = useRouter();
  const { summary, activityLevels } = useDashboardData();
  const recentEvents = useViewCacheRows<ICameraEventCacheRow>(VIEW_CACHE_KEYS.cameraEvents);
  const { t } = useTranslation();
  const { isCompact, isExpanded } = useWindowClass();
  const { can, role } = usePermissions();
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  const [formOpen, setFormOpen] = useState(newParam === 'camera');

  const { cameras: items, isPendingCamera } = useCameraRows();
  const thumbnails = useCameraThumbnails(items);
  const canCreate = can('camera', 'create');

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
      next.zones += item.zones.length;
      next[item.recordMode] += 1;
    }
    return next;
  }, [items]);

  const openCamera = useCallback((id: string) => router.push(`/cameras/${id}`), [router]);
  const openForm = useCallback(() => setFormOpen(true), []);

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
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={t('screens.cameras.title')}
          subtitle={t('screens.cameras.subtitle', {
            online: String(counts.online),
            total: String(items.length),
          })}
          onBack={() => router.back()}
          action={
            canCreate ? (
              <IconButton icon="plus" label={t('screens.cameras.connect')} onPress={openForm} />
            ) : null
          }
        />
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
          contentContainerClassName="pb-6">
          <View className={isExpanded ? 'flex-row items-stretch gap-6' : 'gap-4'}>
            <View className="gap-4" style={isExpanded ? { width: SUMMARY_PANEL_WIDTH } : undefined}>
              <CameraSummary counts={counts} layout={isExpanded ? 'panel' : 'strip'} compact={isCompact} />
              {isExpanded ? detections : null}
            </View>
            <View className={isExpanded ? 'min-w-0 flex-1 gap-4' : 'gap-4'}>
              <CameraCardGrid
                items={items}
                isPending={isPendingCamera}
                thumbnails={thumbnails}
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
    </AppScreen>
  );
}

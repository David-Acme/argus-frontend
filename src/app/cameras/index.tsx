import { LegendList } from '@legendapp/list/react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import Animated from 'react-native-reanimated';
import { useAuthStore } from '@/core/stores';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import { CameraForm, CameraRow, type CameraRowItem } from '@/shared/components/cameras';
import { DashboardIconButton, SectionHeading } from '@/shared/components/dashboard';
import { Button } from '@/shared/components/ui/button';
import { Text } from '@/shared/components/ui/text';
import { CAMERA_ROW_HEIGHT, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useBottomNavInset } from '@/shared/hooks/use-bottom-nav-inset';
import { useCachedRows } from '@/shared/hooks/use-cached-rows';
import { useObservableReady } from '@/shared/hooks/use-observable';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { EmptyState, ScreenShell } from '@/shared/components/layout';

export default function CamerasScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isWide } = useWindowClass();
  const authStatus = useAuthStore((state) => state.status);
  const { can } = usePermissions();
  const bottomInset = useBottomNavInset();
  const { new: newParam } = useLocalSearchParams<{ new?: string }>();
  const [formOpen, setFormOpen] = useState(newParam === 'camera');

  const [cameras, camerasReady] = useObservableReady(() => cameraService.observeList(), [], []);
  const [zones, zonesReady] = useObservableReady(() => zoneService.observeAll(), [], []);

  const liveItems = useMemo<CameraRowItem[]>(() => {
    const zonesByCamera = new Map<string, number>();
    for (const zone of zones) {
      zonesByCamera.set(zone.cameraId, (zonesByCamera.get(zone.cameraId) ?? 0) + 1);
    }
    return cameras.map((camera) => ({
      id: camera.id,
      icon: (camera.icon || 'video') as CameraRowItem['icon'],
      name: camera.name,
      ip: camera.ip,
      model: [camera.manufacturer, camera.model].filter(Boolean).join(' '),
      isOnline: camera.isOnline,
      isEnabled: camera.isEnabled,
      zones: zonesByCamera.get(camera.id) ?? 0,
    }));
  }, [cameras, zones]);
  const items = useCachedRows(
    VIEW_CACHE_KEYS.cameraList,
    liveItems,
    camerasReady && zonesReady,
  );

  const online = items.filter((item) => item.isEnabled && item.isOnline).length;

  const statusLabel = useCallback(
    (item: CameraRowItem) =>
      !item.isEnabled
        ? t('screens.cameras.status.disabled')
        : item.isOnline
          ? t('screens.cameras.status.online')
          : t('screens.cameras.status.offline'),
    [t],
  );

  const openCamera = useCallback((id: string) => router.push(`/cameras/${id}`), [router]);

  if (authStatus !== 'signed-in') return <Redirect href="/" />;

  return (
    <ScreenShell
      title={t('screens.cameras.title')}
      subtitle={t('screens.cameras.subtitle', { online: String(online), total: String(items.length) })}
      onBack={() => router.back()}
      action={
        can('camera', 'create') ? (
          <DashboardIconButton
            icon="plus"
            label={t('screens.cameras.connect')}
            onPress={() => setFormOpen(true)}
          />
        ) : null
      }>
      <Animated.View entering={screenIn} className="flex-1 gap-3">
        {items.length === 0 && camerasReady && zonesReady ? (
          <EmptyState
            icon="video"
            title={t('screens.cameras.empty')}
            hint={t('screens.cameras.empty-hint')}
            action={
              can('camera', 'create') ? (
                <Button onPress={() => setFormOpen(true)}>
                  <Text>{t('screens.cameras.connect')}</Text>
                </Button>
              ) : null
            }
          />
        ) : items.length > 0 ? (
          <>
            {isWide ? <SectionHeading title={t('screens.cameras.title')} /> : null}
            <LegendList
              data={items}
              keyExtractor={(item) => item.id}
              estimatedItemSize={CAMERA_ROW_HEIGHT}
              recycleItems
              contentContainerStyle={{ gap: 10, paddingBottom: bottomInset }}
              renderItem={({ item }) => (
                <CameraRow
                  item={item}
                  statusLabel={statusLabel(item)}
                  zonesLabel={t('screens.cameras.zones-count', { count: String(item.zones) })}
                  onPress={openCamera}
                />
              )}
            />
          </>
        ) : null}
      </Animated.View>

      <CameraForm open={formOpen} onOpenChange={setFormOpen} />
    </ScreenShell>
  );
}

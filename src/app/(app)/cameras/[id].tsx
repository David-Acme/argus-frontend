import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cameraControlService } from '@/core/services/camera-control.service';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import type {
  ICameraCacheRow,
  ICameraDeviceStatus,
} from '@/core/interfaces';
import type { MenuOption, ZoneType } from '@/core/types';
import {
  CameraForm,
  CameraLiveView,
  CameraSettingsSheet,
  CameraTalkSheet,
  PtzPad,
  ZoneForm,
  ZoneRow,
} from '@/shared/components/cameras';
import { DashboardIconButton } from '@/shared/components/dashboard';
import { SectionHeader } from '@/shared/components/ui/section-header';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { EmptyState } from '@/shared/components/ui/empty-state';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheRows } from '@/shared/hooks/use-cached-rows';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { useTranslation } from '@/shared/hooks/use-translation';
import { screenIn } from '@/shared/libs/animations';
import { runServiceAction } from '@/shared/libs/service-action';
import { useServiceAction } from '@/shared/hooks/use-service-action';

type CameraAction = 'edit' | 'toggle' | 'delete';

export default function CameraDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = usePermissions();
  const { isWide } = useWindowClass();
  const [editOpen, setEditOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const { run: move, pending: moving } = useServiceAction();

  const cameras = useViewCacheRows<ICameraCacheRow>(VIEW_CACHE_KEYS.cameraList);
  const camera = useMemo(() => cameras.find((item) => item.id === id) ?? null, [cameras, id]);
  const zones = useMemo(() => camera?.zones ?? [], [camera]);
  const loadDevice = useCallback(() => cameraControlService.status(id), [id]);
  const loadFeatures = useCallback(() => cameraControlService.capabilities(id), [id]);
  const deviceResource = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.cameraDevice, scope: id, load: loadDevice });
  const { data: features } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.cameraCapabilities,
    scope: id,
    load: loadFeatures,
  });
  const device = deviceResource.data;
  const mutateDevice = deviceResource.mutate;
  const applyDevice = useCallback((status: ICameraDeviceStatus | null) => mutateDevice(() => status), [mutateDevice]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);

  const typeLabels = useMemo<Record<ZoneType, string>>(
    () => ({
      monitor: t('screens.cameras.zone-monitor'),
      alert: t('screens.cameras.zone-alert'),
      exclude: t('screens.cameras.zone-exclude'),
    }),
    [t],
  );

  const actions = useMemo<MenuOption<CameraAction>[]>(
    () => [
      { value: 'edit', label: t('screens.cameras.edit'), icon: 'square-pen' },
      { value: 'toggle', label: camera?.isEnabled ? t('screens.cameras.status.disabled') : t('screens.cameras.status.online'), icon: 'eye' },
      { value: 'delete', label: t('screens.cameras.delete'), icon: 'trash' },
    ],
    [camera?.isEnabled, t],
  );

  const runAction = useCallback(
    async (action: CameraAction) => {
      if (!camera) return;
      if (action === 'edit') {
        setEditOpen(true);
        return;
      }
      if (action === 'toggle') {
        await runServiceAction({
          confirm: camera.isEnabled
            ? {
                title: t('screens.cameras.disable-confirm-title', { name: camera.name }),
                description: t('screens.cameras.disable-confirm-body'),
                intent: 'warning',
              }
            : undefined,
          call: () => cameraService.update(camera.id, { isEnabled: !camera.isEnabled }),
        });
        return;
      }
      const removed = await runServiceAction({
        confirm: {
          title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
          description: t('screens.cameras.delete-confirm-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        call: () => cameraService.remove(camera.id),
        success: t('screens.cameras.removed'),
      });
      if (removed) router.back();
    },
    [camera, router, t],
  );

  const step = useCallback(
    (direction: number) =>
      move({ call: () => cameraControlService.move(id, { angle: direction }), errorTitle: t('screens.cameras.device-offline') }),
    [id, move, t],
  );

  const center = useCallback(
    () => move({ call: () => cameraControlService.move(id, { x: 0, y: 0 }), errorTitle: t('screens.cameras.device-offline') }),
    [id, move, t],
  );

  const removeZone = useCallback(
    async (targetId: string, name: string) => {
      await runServiceAction({
        confirm: {
          title: t('screens.cameras.delete-zone-confirm', { name }),
          description: t('screens.cameras.delete-zone-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        call: () => zoneService.remove(targetId),
        success: t('screens.cameras.zone-removed'),
      });
    },
    [t],
  );
  if (!camera) return <Redirect href="/cameras" />;

  return (
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={camera.name}
          subtitle={[camera.ip, camera.isOnline ? t('screens.cameras.status.online') : t('screens.cameras.status.offline')]
            .filter(Boolean)
            .join(' · ')}
          onBack={() => router.back()}
          action={
            !can('camera', 'update') ? null : (
            <AdaptiveMenu
              options={actions}
              onSelect={(value) => void runAction(value)}
              title={camera.name}
              closeLabel={t('common.close')}
              trigger={
                <DashboardIconButton icon="more-horizontal" label={t('screens.cameras.edit')} />
              }
            />
            )
          }
        />
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        {camera.isEnabled ? (
          <View className="mb-5">
            <CameraLiveView cameraId={camera.id} />
          </View>
        ) : null}
        <Animated.View
          entering={screenIn}
          className={isWide ? 'flex-row items-start gap-5' : 'gap-5'}>
          <View className={isWide ? 'bg-card w-[320px] shrink-0 gap-2 rounded-2xl p-4' : 'bg-card gap-2 rounded-2xl p-4'}>
            <Row label={t('screens.cameras.form.ip')} value={`${camera.ip}:${camera.port}`} />
            <Row
              label={t('screens.cameras.record-mode')}
              value={
                camera.recordMode === 'continuous'
                  ? t('screens.cameras.form.record-continuous')
                  : t('screens.cameras.form.record-events')
              }
            />
            {camera.retentionDays != null ? (
              <Row
                label={t('screens.cameras.form.retention')}
                value={String(camera.retentionDays)}
              />
            ) : null}
          </View>

          <View className={isWide ? 'min-w-0 flex-1 gap-5' : 'gap-5'}>
            {can('camera', 'update') && features?.ptz !== false ? (
              <View className="bg-card gap-4 rounded-2xl p-4">
                <View className="flex-row items-center justify-between">
                  <View className="min-w-0 flex-1">
                    <Text className="text-body font-semibold">
                      {t('screens.cameras.ptz')}
                    </Text>
                    <Text variant="caption" className="text-foreground-secondary" numberOfLines={1}>
                      {device?.model
                        ? [device.model, device.firmware].filter(Boolean).join(' · ')
                        : t('screens.cameras.device-offline')}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    {features?.talk ? (
                      <Button variant="outline" size="sm" onPress={() => setTalkOpen(true)}>
                        <Icon name="mic" className="text-foreground size-4" />
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onPress={() => setSettingsOpen(true)}>
                      <Text>{t('screens.cameras.settings')}</Text>
                    </Button>
                  </View>
                </View>

                <PtzPad
                  labels={{
                    up: t('screens.cameras.ptz-up'),
                    down: t('screens.cameras.ptz-down'),
                    left: t('screens.cameras.ptz-left'),
                    right: t('screens.cameras.ptz-right'),
                    center: t('screens.cameras.ptz-center'),
                  }}
                  disabled={moving}
                  onStep={(angle) => void step(angle)}
                  onCenter={() => void center()}
                />
              </View>
            ) : null}

            <SectionHeader
              title={t('screens.cameras.zones')}
              action={can('zone', 'create') ? t('screens.cameras.add-zone') : undefined}
              onAction={
                can('zone', 'create')
                  ? () => {
                      setZoneId('');
                      setZoneOpen(true);
                    }
                  : undefined
              }
            />
            {zones.length === 0 ? (
              <EmptyState
                icon="shield-check"
                title={t('screens.cameras.zones-empty')}
                fill={false}
                action={
                  can('zone', 'create') ? (
                    <Button
                      variant="outline"
                      onPress={() => {
                        setZoneId('');
                        setZoneOpen(true);
                      }}>
                      <Text>{t('screens.cameras.add-zone')}</Text>
                    </Button>
                  ) : null
                }
              />
            ) : (
              <View className="gap-2">
                {zones.map((item) => (
                  <View key={item.id} className="flex-row items-center gap-2">
                    <View className="flex-1">
                      <ZoneRow
                        id={item.id}
                        name={item.name}
                        typeLabel={typeLabels[item.zoneType as ZoneType] ?? item.zoneType}
                        pointsLabel={t('screens.cameras.zone-points-count', {
                          count: String(item.points.length),
                        })}
                        color={item.color}
                        onPress={(pressedId) => {
                          setZoneId(pressedId);
                          setZoneOpen(true);
                        }}
                      />
                    </View>
                    {can('zone', 'delete') ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        accessibilityLabel={t('screens.cameras.delete-zone')}
                        onPress={() => void removeZone(item.id, item.name)}>
                        <Icon name="trash" className="text-error-strong size-4" />
                      </Button>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <CameraForm open={editOpen} onOpenChange={setEditOpen} camera={camera} />
      <CameraTalkSheet open={talkOpen} onOpenChange={setTalkOpen} cameraId={camera.id} />
      <CameraSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        cameraId={camera.id}
        status={device}
        onApplied={applyDevice}
      />
      <ZoneForm open={zoneOpen} onOpenChange={setZoneOpen} cameraId={camera.id} zone={zone} />
    </AppScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-foreground-secondary text-caption">{label}</Text>
      <Text className="text-caption font-medium">{value}</Text>
    </View>
  );
}

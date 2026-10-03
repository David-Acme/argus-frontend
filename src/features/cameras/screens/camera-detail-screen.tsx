import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICameraDeviceStatus, IZoneCacheRow } from '@/core/interfaces';
import type { CameraStreamQuality, MenuOption, TranslationKey } from '@/core/types';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { CameraControlPanel } from '@/features/cameras/components/camera-control-panel';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { CameraInfoPanel } from '@/features/cameras/components/camera-info-panel';
import { CameraLivePanel } from '@/features/cameras/components/camera-live-panel';
import { CameraSettingsSheet } from '@/features/cameras/components/camera-settings-sheet';
import { CameraTalkSheet } from '@/features/cameras/components/camera-talk-sheet';
import { CameraZonesPanel } from '@/features/cameras/components/camera-zones-panel';
import { ZoneForm } from '@/features/cameras/components/zone-form';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { cameraStatusOf, type CameraCardStatus } from '@/features/cameras/components/camera-card';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { IconButton } from '@/shared/components/ui/icon-button';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { runOptimistic } from '@/shared/libs/optimistic-action';

type CameraAction = 'edit' | 'toggle' | 'delete';

const STATUS_LABEL = {
  online: 'screens.cameras.status.online',
  offline: 'screens.cameras.status.offline',
  disabled: 'screens.cameras.status.disabled',
} as const satisfies Record<CameraCardStatus, TranslationKey>;

export default function CameraDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = usePermissions();
  const { isExpanded, isMedium, isWide } = useWindowClass();
  const [editOpen, setEditOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [quality, setQuality] = useState<CameraStreamQuality>('sub');
  const { run: move, pending: moving } = useServiceAction();

  const { cameras, isPendingZone } = useCameraRows();
  const camera = useMemo(() => cameras.find((item) => item.id === id) ?? null, [cameras, id]);
  const zones = useMemo(() => camera?.zones ?? [], [camera]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);
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

  const canUpdate = can('camera', 'update');
  const canDelete = can('camera', 'delete');
  const streamOnly = features?.streamOnly === true;
  const controllable = canUpdate && features?.ptz === true;

  const actions = useMemo<MenuOption<CameraAction>[]>(() => {
    const options: MenuOption<CameraAction>[] = [];
    if (canUpdate) {
      options.push({ value: 'edit', label: t('screens.cameras.edit'), icon: 'square-pen' });
      options.push({
        value: 'toggle',
        label: camera?.isEnabled ? t('screens.cameras.disable') : t('screens.cameras.enable'),
        icon: camera?.isEnabled ? 'square' : 'play',
      });
    }
    if (canDelete) options.push({ value: 'delete', label: t('screens.cameras.delete'), icon: 'trash' });
    return options;
  }, [camera?.isEnabled, canDelete, canUpdate, t]);

  const setEnabled = useCallback(
    (cameraId: string, name: string, enabled: boolean) =>
      runOptimistic({
        confirm: enabled
          ? undefined
          : {
              title: t('screens.cameras.disable-confirm-title', { name }),
              description: t('screens.cameras.disable-confirm-body'),
              intent: 'warning',
            },
        intents: [{ table: 'camera', kind: 'update', recordId: cameraId, values: { isEnabled: enabled } }],
        call: () => cameraService.update(cameraId, { isEnabled: enabled }),
      }),
    [t],
  );

  const runAction = useCallback(
    async (action: CameraAction) => {
      if (!camera) return;
      if (action === 'edit') {
        setEditOpen(true);
        return;
      }
      if (action === 'toggle') {
        await setEnabled(camera.id, camera.name, !camera.isEnabled);
        return;
      }
      await runOptimistic({
        confirm: {
          title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
          description: t('screens.cameras.delete-confirm-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        intents: [{ table: 'camera', kind: 'delete', recordId: camera.id }],
        call: () => cameraService.remove(camera.id),
        success: t('screens.cameras.removed'),
      });
    },
    [camera, setEnabled, t],
  );

  const step = useCallback(
    (direction: number) =>
      void move({
        call: () => cameraControlService.move(id, { angle: direction }),
        errorTitle: t('screens.cameras.device-offline'),
      }),
    [id, move, t],
  );

  const center = useCallback(
    () =>
      void move({
        call: () => cameraControlService.move(id, { x: 0, y: 0 }),
        errorTitle: t('screens.cameras.device-offline'),
      }),
    [id, move, t],
  );

  const openZone = useCallback((target: string) => {
    setZoneId(target);
    setZoneOpen(true);
  }, []);

  const removeZone = useCallback(
    (target: IZoneCacheRow) =>
      void runOptimistic({
        confirm: {
          title: t('screens.cameras.delete-zone-confirm', { name: target.name }),
          description: t('screens.cameras.delete-zone-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        },
        intents: [{ table: 'zone', kind: 'delete', recordId: target.id }],
        call: () => zoneService.remove(target.id),
        success: t('screens.cameras.zone-removed'),
      }),
    [t],
  );

  if (!camera) return <Redirect href="/cameras" />;

  const status = cameraStatusOf(camera);
  const stretch = isWide ? 'grow' : undefined;
  const live = (
    <CameraLivePanel
      cameraId={camera.id}
      enabled={camera.isEnabled}
      zones={zones}
      showZones={showZones}
      quality={quality}
      canEnable={canUpdate}
      onShowZonesChange={setShowZones}
      onQualityChange={setQuality}
      onEnable={() => void setEnabled(camera.id, camera.name, true)}
    />
  );
  const info = (
    <CameraInfoPanel camera={camera} device={device} streamOnly={streamOnly} className={controllable ? undefined : stretch} />
  );
  const control =
    controllable && features ? (
      <CameraControlPanel
        features={features}
        device={device}
        moving={moving}
        onStep={step}
        onCenter={center}
        onTalk={() => setTalkOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        className={stretch}
      />
    ) : null;
  const zonesPanel = (
    <CameraZonesPanel
      zones={zones}
      canCreate={can('zone', 'create')}
      canEdit={can('zone', 'update')}
      canDelete={can('zone', 'delete')}
      isPending={isPendingZone}
      onCreate={() => openZone('')}
      onEdit={openZone}
      onDelete={removeZone}
      className={stretch}
    />
  );

  return (
    <AppScreen
      scrollable={false}
      bottomNav={false}
      header={
        <ScreenHeader
          title={camera.name}
          subtitle={[camera.ip, t(STATUS_LABEL[status])].join(' · ')}
          onBack={() => router.back()}
          action={
            actions.length === 0 ? null : (
              <AdaptiveMenu
                options={actions}
                onSelect={(value) => void runAction(value)}
                title={camera.name}
                closeLabel={t('common.close')}
                trigger={<IconButton icon="more-horizontal" label={t('screens.cameras.edit')} />}
              />
            )
          }
        />
      }>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="grow pb-8">
        <Animated.View entering={screenIn} className="grow">
          {isExpanded ? (
            <View className="grow flex-row items-stretch gap-6">
              <View className="min-w-0 flex-1 gap-5">
                {live}
                {zonesPanel}
              </View>
              <View className="w-[340px] shrink-0 gap-5">
                {info}
                {control}
              </View>
            </View>
          ) : isMedium ? (
            <View className="grow gap-5">
              {live}
              <View className="grow flex-row items-stretch gap-5">
                <View className="min-w-0 flex-1 gap-5">
                  {info}
                  {control}
                </View>
                <View className="min-w-0 flex-1 gap-5">{zonesPanel}</View>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              {live}
              {info}
              {control}
              {zonesPanel}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <CameraForm open={editOpen} onOpenChange={setEditOpen} camera={camera} />
      <CameraTalkSheet open={talkOpen} onOpenChange={setTalkOpen} cameraId={camera.id} />
      <CameraSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        cameraId={camera.id}
        status={device}
        features={features}
        onApplied={applyDevice}
      />
      <ZoneForm open={zoneOpen} onOpenChange={setZoneOpen} cameraId={camera.id} zone={zone} zones={zones} />
    </AppScreen>
  );
}

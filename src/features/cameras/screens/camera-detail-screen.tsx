import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICameraDeviceStatus, IZoneCacheRow } from '@/core/interfaces';
import type { CameraStreamQuality, MenuOption } from '@/core/types';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { CameraCallPanel } from '@/features/cameras/components/camera-call-panel';
import { CameraControlPanel } from '@/features/cameras/components/camera-control-panel';
import { useCameraCall } from '@/features/cameras/hooks/use-camera-call';
import { nextPresetName, parsePresets, type CameraPreset } from '@/features/cameras/model/camera-presets';
import { CameraEnvironmentPanel } from '@/features/security';
import { isVoiceCallActive, voiceCallSupported } from '@/features/voice';
import { cameraActionAccessForRole } from '@/shared/libs/role-access';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { CameraInfoPanel } from '@/features/cameras/components/camera-info-panel';
import { CameraLivePanel } from '@/features/cameras/components/camera-live-panel';
import { CameraSettingsSheet } from '@/features/cameras/components/camera-settings-sheet';
import { CameraTalkSheet } from '@/features/cameras/components/camera-talk-sheet';
import { CameraZonesPanel } from '@/features/cameras/components/camera-zones-panel';
import { ZoneForm } from '@/features/cameras/components/zone-form';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { cameraStatusOf } from '@/features/cameras/model/camera-overview';
import { STATUS_LABEL } from '@/features/cameras/model/camera-status';
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


export default function CameraDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, talk } = useLocalSearchParams<{ id: string; talk?: string }>();
  const { can, role } = usePermissions();
  const { isExpanded, isMedium, isWide } = useWindowClass();
  const [editOpen, setEditOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [talkOpen, setTalkOpen] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [quality, setQuality] = useState<CameraStreamQuality>('sub');
  const { run: move, pending: moving } = useServiceAction();
  const call = useCameraCall(id);
  const autoCalled = useRef(false);

  const { cameras, isPendingZone } = useCameraRows();
  const camera = useMemo(() => cameras.find((item) => item.id === id) ?? null, [cameras, id]);
  const zones = useMemo(() => camera?.zones ?? [], [camera]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);
  const canUpdate = can('camera', 'update');
  const loadDevice = useCallback(() => cameraControlService.status(id), [id]);
  const loadFeatures = useCallback(() => cameraControlService.capabilities(id), [id]);
  const deviceResource = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.cameraDevice, scope: id, load: loadDevice });
  const { data: features } = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.cameraCapabilities,
    scope: id,
    load: loadFeatures,
  });
  const loadPresets = useCallback(() => cameraControlService.presets(id), [id]);
  const presetResource = useRemoteResource<unknown>({
    cacheKey: VIEW_CACHE_KEYS.cameraPresets,
    scope: id,
    load: loadPresets,
    enabled: features?.presets === true && canUpdate,
  });
  const presets = useMemo(() => parsePresets(presetResource.data), [presetResource.data]);
  const reloadPresets = presetResource.reload;
  const device = deviceResource.data;
  const mutateDevice = deviceResource.mutate;
  const applyDevice = useCallback((status: ICameraDeviceStatus | null) => mutateDevice(() => status), [mutateDevice]);


  const canDelete = can('camera', 'delete');
  const streamOnly = features?.streamOnly === true;
  const controllable =
    canUpdate &&
    features != null &&
    [features.ptz, features.privacy, features.led, features.dayNight, features.motion, features.alarm].some(
      (value) => value === true,
    );
  const canTalk = cameraActionAccessForRole(role).talk && features?.talk === true;
  const micSupported = voiceCallSupported();
  const startCall = call.start;

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

  const gotoPreset = useCallback(
    (preset: CameraPreset) =>
      void move({
        call: () => cameraControlService.preset(id, { action: 'goto', id: preset.id }),
        errorTitle: t('screens.cameras.device-offline'),
      }),
    [id, move, t],
  );

  const savePreset = useCallback(async () => {
    const saved = await move({
      call: () =>
        cameraControlService.preset(id, { action: 'save', name: nextPresetName(presets, t('screens.cameras.preset-name')) }),
      success: t('screens.cameras.preset-saved'),
      errorTitle: t('screens.cameras.device-offline'),
    });
    if (saved) void reloadPresets();
  }, [id, move, presets, reloadPresets, t]);

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

  useEffect(() => {
    if (talk !== '1' || autoCalled.current || !canTalk || !micSupported || isVoiceCallActive()) return;
    autoCalled.current = true;
    startCall('call', true);
  }, [canTalk, micSupported, startCall, talk]);

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
    <CameraInfoPanel camera={camera} device={device} streamOnly={streamOnly} />
  );
  const control =
    controllable && features ? (
      <CameraControlPanel
        features={features}
        device={device}
        moving={moving}
        onStep={step}
        onCenter={center}
        onSettings={() => setSettingsOpen(true)}
        presets={presets}
        onGotoPreset={gotoPreset}
        onSavePreset={() => void savePreset()}
        className={stretch}
      />
    ) : null;
  const callPanel =
    camera.isEnabled && features ? (
      <CameraCallPanel
        controls={call}
        canTalk={canTalk}
        micSupported={micSupported}
        argusCallActive={isVoiceCallActive()}
        onAnnounce={canTalk ? () => setTalkOpen(true) : undefined}
      />
    ) : null;
  const environment = <CameraEnvironmentPanel cameraId={camera.id} className={controllable ? undefined : stretch} />;
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
              <View className="w-[360px] shrink-0 gap-5">
                {callPanel}
                {info}
                {environment}
                {control}
              </View>
            </View>
          ) : isMedium ? (
            <View className="grow gap-5">
              {live}
              <View className="grow flex-row items-stretch gap-5">
                <View className="min-w-0 flex-1 gap-5">
                  {callPanel}
                  {info}
                  {environment}
                  {control}
                </View>
                <View className="min-w-0 flex-1 gap-5">{zonesPanel}</View>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              {live}
              {callPanel}
              {info}
              {environment}
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

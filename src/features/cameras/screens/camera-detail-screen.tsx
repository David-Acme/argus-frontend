import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICameraCapabilities, ICameraDeviceStatus, IZoneCacheRow } from '@/core/interfaces';
import type { MenuOption } from '@/core/types';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import { cameraControlService } from '@/features/cameras/services/camera-control.service';
import { CameraCallPanel } from '@/features/cameras/components/camera-call-panel';
import { CameraControlPanel } from '@/features/cameras/components/camera-control-panel';
import { useCameraCall } from '@/features/cameras/hooks/use-camera-call';
import { useCameraDeviceSettings } from '@/features/cameras/hooks/use-camera-device-settings';
import { useCameraLiveAudio } from '@/features/cameras/hooks/use-camera-live-audio';
import { useCameraLiveStage } from '@/features/cameras/hooks/use-camera-live-stage';
import { useCameraPtz } from '@/features/cameras/hooks/use-camera-ptz';
import { useCameraQuality } from '@/features/cameras/hooks/use-camera-quality';
import { hasDeviceControls, resolveCapabilities } from '@/features/cameras/model/camera-capabilities';
import { nextPresetName, parsePresets, type CameraPreset } from '@/features/cameras/model/camera-presets';
import { CameraEnvironmentPanel } from '@/features/security';
import { isVoiceCallActive, voiceCallSupported } from '@/features/voice';
import { cameraActionAccessForRole } from '@/shared/libs/role-access';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { CameraInfoPanel } from '@/features/cameras/components/camera-info-panel';
import { CameraLiveFullscreen, CameraLivePanel } from '@/features/cameras/components/camera-live-panel';
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
  const [talkOpen, setTalkOpen] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const quality = useCameraQuality(id);
  const { run: move } = useServiceAction();
  const { cameras, isPendingZone } = useCameraRows();
  const camera = useMemo(() => cameras.find((item) => item.id === id) ?? null, [cameras, id]);
  const call = useCameraCall(id);
  const ptzControls = useCameraPtz(id);
  const stage = useCameraLiveStage({ quality });
  const audio = useCameraLiveAudio(call.snapshot != null && call.snapshot.state !== 'idle');
  const autoCalled = useRef(false);


  const zones = useMemo(() => camera?.zones ?? [], [camera]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);
  const canUpdate = can('camera', 'update');
  const loadDevice = useCallback(() => cameraControlService.status(id), [id]);
  const loadFeatures = useCallback(() => cameraControlService.capabilities(id), [id]);
  const deviceResource = useRemoteResource({ cacheKey: VIEW_CACHE_KEYS.cameraDevice, scope: id, load: loadDevice });
  const featureResource = useRemoteResource<ICameraCapabilities>({
    cacheKey: VIEW_CACHE_KEYS.cameraCapabilities,
    scope: id,
    load: loadFeatures,
  });
  const features = useMemo(
    () => resolveCapabilities(camera?.capabilities ?? [], featureResource.data),
    [camera?.capabilities, featureResource.data],
  );
  const deviceSignature = camera
    ? [camera.driver, camera.ip, camera.port, camera.catalogId, camera.model, ...camera.capabilities].join('|')
    : '';
  const reloadFeatures = featureResource.reload;
  const reloadDevice = deviceResource.reload;
  const seenSignature = useRef(deviceSignature);
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
  const deviceSettings = useCameraDeviceSettings({ cameraId: id, status: device, onApplied: applyDevice });


  const canDelete = can('camera', 'delete');
  const streamOnly = features?.streamOnly === true;
  const controllable = canUpdate && hasDeviceControls(features);
  const mayTalk = cameraActionAccessForRole(role).talk;
  const canTalk = mayTalk && features?.talk === true;
  const talkHint =
    mayTalk && camera?.driver === 'tapo' && features != null && features.talk !== true
      ? t('screens.cameras.call.needs-cloud')
      : null;
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
    if (seenSignature.current === deviceSignature) return;
    seenSignature.current = deviceSignature;
    void reloadFeatures();
    void reloadDevice();
  }, [deviceSignature, reloadDevice, reloadFeatures]);

  useEffect(() => {
    if (talk !== '1' || autoCalled.current || !canTalk || !micSupported || isVoiceCallActive()) return;
    autoCalled.current = true;
    startCall('call', true);
  }, [canTalk, micSupported, startCall, talk]);

  if (!camera) return <Redirect href="/cameras" />;

  const status = cameraStatusOf(camera);
  const stretch = isWide ? 'grow' : undefined;
  const ptz = canUpdate && features?.ptz ? ptzControls : null;
  const live = (
    <CameraLivePanel
      cameraId={camera.id}
      enabled={camera.isEnabled}
      zones={zones}
      showZones={showZones}
      quality={quality}
      stage={stage}
      audio={audio}
      canEnable={canUpdate}
      ptz={ptz}
      presets={
        canUpdate && features?.presets ? { presets, onGoto: gotoPreset, onSave: () => void savePreset() } : null
      }
      onShowZonesChange={setShowZones}
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
        controls={deviceSettings}
        deviceFailed={deviceResource.status === 'failed'}
        className={stretch}
      />
    ) : null;
  const callPanel =
    camera.isEnabled && features ? (
      <CameraCallPanel
        controls={call}
        canTalk={canTalk}
        talkHint={talkHint}
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
      fill={isWide}
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

      {camera.isEnabled ? (
        <CameraLiveFullscreen
          cameraId={camera.id}
          zones={zones}
          showZones={showZones}
          quality={quality}
          ptz={ptz}
          stage={stage}
          audio={audio}
        />
      ) : null}
      <CameraForm open={editOpen} onOpenChange={setEditOpen} camera={camera} />
      <CameraTalkSheet open={talkOpen} onOpenChange={setTalkOpen} cameraId={camera.id} />
      <ZoneForm open={zoneOpen} onOpenChange={setZoneOpen} cameraId={camera.id} zone={zone} zones={zones} />
    </AppScreen>
  );
}

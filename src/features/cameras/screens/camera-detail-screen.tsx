import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { ICameraCapabilities, ICameraClip, ICameraDeviceStatus, IZoneCacheRow } from '@/core/interfaces';
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
import { useCameraAim, useViewerLease } from '@/features/cameras/hooks/use-camera-aim';
import { useCameraPtz } from '@/features/cameras/hooks/use-camera-ptz';
import { CameraAimPanel } from '@/features/cameras/components/camera-aim-panel';
import { CameraSightBadge } from '@/features/cameras/components/camera-sight-badge';
import { CameraSightStatus } from '@/features/cameras/components/camera-sight-status';
import { useCameraQuality } from '@/features/cameras/hooks/use-camera-quality';
import { useCameraSiren } from '@/features/cameras/hooks/use-camera-siren';
import { sirenOffered } from '@/features/cameras/model/siren';
import { hasDeviceControls, resolveCapabilities } from '@/features/cameras/model/camera-capabilities';
import { ptzHoldRenewMs } from '@/features/cameras/model/camera-ptz';
import { nextPresetName, parsePresets, type CameraPreset } from '@/features/cameras/model/camera-presets';
import { CameraEnvironmentPanel, MaintenancePanel } from '@/features/security';
import { useHouseholdWatchman } from '@/features/privacy';
import { CameraWatchPanel } from '@/features/cameras/components/camera-watch-panel';
import { cameraListening, watchPatchOf } from '@/features/cameras/model/camera-watch';
import { useAppSirenEnabled } from '@/features/safety';
import { isVoiceCallActive, voiceCallSupported } from '@/features/voice';
import { CameraForm } from '@/features/cameras/components/camera-form';
import { ClipList } from '@/features/cameras/components/clip-list';
import { RecordingPausedBanner } from '@/features/cameras/components/recording-paused-banner';
import { ClipPlayer } from '../components/clip-player';
import { useCameraClips } from '@/features/cameras/hooks/use-camera-clips';
import { useCameraRecording } from '@/features/cameras/hooks/use-camera-recording';
import { useClipPlayback } from '@/features/cameras/hooks/use-clip-playback';
import { cameraClipsService } from '@/features/cameras/services/camera-clips.service';
import { CameraInfoPanel } from '@/features/cameras/components/camera-info-panel';
import { CameraLiveFullscreen, CameraLivePanel } from '@/features/cameras/components/camera-live-panel';
import { CameraSirenPanel } from '@/features/cameras/components/camera-siren-panel';
import { CameraSirenSheet } from '@/features/cameras/components/camera-siren-sheet';
import { CameraTalkSheet } from '@/features/cameras/components/camera-talk-sheet';
import { CameraZonesPanel } from '@/features/cameras/components/camera-zones-panel';
import { ZoneForm } from '@/features/cameras/components/zone-form';
import { useCameraRows } from '@/features/cameras/hooks/use-camera-rows';
import { cameraStatusOf } from '@/features/cameras/model/camera-overview';
import { STATUS_LABEL } from '@/features/cameras/model/camera-status';
import { AppScreen, ScreenHeader } from '@/shared/components/layout';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { IconButton } from '@/shared/components/ui/icon-button';
import { CAPABILITY, VIEW_CACHE_KEYS } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useRemoteResource } from '@/shared/hooks/use-remote-resource';
import { useServiceAction } from '@/shared/hooks/use-service-action';
import { useTranslation } from '@/shared/hooks/use-translation';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { screenIn } from '@/shared/libs/animations';
import { cameraPrivacyMasked } from '@/shared/libs/camera-privacy';
import { runOptimistic } from '@/shared/libs/optimistic-action';

type CameraAction = 'edit' | 'toggle' | 'delete';


export default function CameraDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, talk } = useLocalSearchParams<{ id: string; talk?: string }>();
  const { can, has, clips: clipAccess, cameraActions, guard: guardAccess } = useCapabilities();
  const { isExpanded, isMedium, isWide } = useWindowClass();
  const [editOpen, setEditOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [talkOpen, setTalkOpen] = useState(false);
  const [sirenOpen, setSirenOpen] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const quality = useCameraQuality(id);
  const { run: move } = useServiceAction();
  const { cameras, isPendingZone } = useCameraRows();
  const camera = useMemo(() => cameras.find((item) => item.id === id) ?? null, [cameras, id]);
  const call = useCameraCall(id);
  const stage = useCameraLiveStage({ quality });
  const audio = useCameraLiveAudio(call.snapshot != null && call.snapshot.state !== 'idle');
  const autoCalled = useRef(false);


  const clipsState = useCameraClips(id, clipAccess.view);
  const recording = useCameraRecording(clipAccess.view);
  const playback = useClipPlayback(id);
  const zones = useMemo(() => camera?.zones ?? [], [camera]);
  const zone = useMemo(() => zones.find((item) => item.id === zoneId) ?? null, [zones, zoneId]);
  const canUpdate = can('camera', 'update');
  const loadDevice = useCallback(() => cameraControlService.status(id), [id]);
  const loadFeatures = useCallback(() => cameraControlService.capabilities(id), [id]);
  const deviceResource = useRemoteResource({
    cacheKey: VIEW_CACHE_KEYS.cameraDevice,
    scope: id,
    load: loadDevice,
    resources: [{ domain: 'camera', scope: 'status', id: Number(id) }],
  });
  const featureResource = useRemoteResource<ICameraCapabilities>({
    cacheKey: VIEW_CACHE_KEYS.cameraCapabilities,
    scope: id,
    load: loadFeatures,
  });
  const features = useMemo(
    () => resolveCapabilities(camera?.capabilities ?? [], featureResource.data),
    [camera?.capabilities, featureResource.data],
  );
  const ptzControls = useCameraPtz(id, ptzHoldRenewMs(features));
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
    enabled: features?.presets === true && cameraActions.aim,
    resources: [{ domain: 'camera', scope: 'status', id: Number(id) }],
  });
  const presets = useMemo(() => parsePresets(presetResource.data), [presetResource.data]);
  const reloadPresets = presetResource.reload;
  const device = deviceResource.data;
  const mutateDevice = deviceResource.mutate;
  const applyDevice = useCallback((status: ICameraDeviceStatus | null) => mutateDevice(() => status), [mutateDevice]);
  const deviceSettings = useCameraDeviceSettings({ cameraId: id, status: device, onApplied: applyDevice });
  const aimable = features?.ptz === true;
  const aimControls = useCameraAim({ cameraId: id, synced: camera?.aim, enabled: aimable && cameraActions.watch });
  const reloadAim = aimControls.reload;
  const ptzAllowed = cameraActions.aim && aimable && camera?.isEnabled === true;
  useViewerLease(id, ptzAllowed && stage.showPad && stage.live, aimControls.apply);


  const canDelete = can('camera', 'delete');
  const streamOnly = features?.streamOnly === true;
  const controllable = canUpdate && hasDeviceControls(features);
  const maySiren = has(CAPABILITY.cameraSiren);
  const mayTalk = has(CAPABILITY.cameraTalk);
  const canTalk = mayTalk && features?.talk === true;
  const appSirenEnabled = useAppSirenEnabled();
  const canSiren = sirenOffered({
    allowed: maySiren,
    supported: features?.alarm === true,
    enabled: appSirenEnabled,
  });
  const talkHint =
    mayTalk && camera?.driver === 'tapo' && features != null && features.talk !== true
      ? t('screens.cameras.call.needs-cloud')
      : null;
  const siren = useCameraSiren(id);
  const householdWatchman = useHouseholdWatchman({ enabled: has(CAPABILITY.privacyHousehold) });
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

  const setWatch = useCallback(
    (cameraId: string, field: 'watchman' | 'noAudio', value: boolean) => {
      const patch = watchPatchOf(field, value);
      return runOptimistic({
        intents: [{ table: 'camera', kind: 'update', recordId: cameraId, values: patch }],
        call: () => cameraService.update(cameraId, patch),
        errorTitle: t('screens.cameras.watch.save-failed'),
      });
    },
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
        errorTitle: t('screens.cameras.sight.move-failed'),
      }),
    [id, move, t],
  );

  const goHome = useCallback(
    () =>
      void move({
        call: () => cameraControlService.preset(id, { action: 'go_home' }),
        errorTitle: t('screens.cameras.sight.move-failed'),
      }),
    [id, move, t],
  );

  const setHome = useCallback(
    async (preset: CameraPreset) => {
      const saved = await move({
        confirm: {
          title: t('screens.cameras.sight.set-home-title', { name: preset.name || preset.id }),
          description: t('screens.cameras.sight.set-home-body'),
          confirmLabel: t('screens.cameras.sight.set-home'),
        },
        call: () => cameraControlService.preset(id, { action: 'set_home', id: preset.id }),
        success: t('screens.cameras.sight.home-saved'),
        errorTitle: t('screens.cameras.sight.home-failed'),
      });
      if (saved) void reloadAim();
    },
    [id, move, reloadAim, t],
  );

  const savePreset = useCallback(async () => {
    const saved = await move({
      call: () =>
        cameraControlService.preset(id, { action: 'save', name: nextPresetName(presets, t('screens.cameras.preset-name')) }),
      success: t('screens.cameras.preset-saved'),
      errorTitle: t('screens.cameras.preset-save-failed'),
    });
    if (saved) void reloadPresets();
  }, [id, move, presets, reloadPresets, t]);


  const openZone = useCallback((target: string) => {
    setZoneId(target);
    setZoneOpen(true);
  }, []);

  const removeClip = useCallback(
    (clip: ICameraClip) =>
      void move({
        confirm: {
          title: t('screens.cameras.clips.delete-title'),
          description: t('screens.cameras.clips.delete-description'),
          confirmLabel: t('screens.cameras.clips.delete-confirm'),
          intent: 'danger',
        },
        call: () => cameraClipsService.remove(id, clip.id),
        success: t('screens.cameras.clips.deleted'),
        errorTitle: t('screens.cameras.clips.delete-failed'),
      }).then((result) => {
        if (!result) return;
        if (playback.clip?.id === clip.id) playback.close();
        clipsState.forget(clip);
      }),
    [clipsState, id, move, playback, t],
  );

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

  const masked = cameraPrivacyMasked(camera.privacyState);
  const status = cameraStatusOf(camera);
  const stretch = isWide ? 'grow' : undefined;
  const ptz = ptzAllowed ? ptzControls : null;
  const badge = aimable ? <CameraSightBadge activity={aimControls.activity} /> : null;
  const sight = aimable ? <CameraSightStatus controls={aimControls} /> : null;
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
        cameraActions.aim && features?.presets
          ? {
              presets,
              homePreset: aimControls.homePreset,
              onGoto: gotoPreset,
              onGoHome: aimControls.homePreset ? goHome : null,
              onSave: cameraActions.managePresets ? () => void savePreset() : null,
              onSetHome: cameraActions.managePresets ? (preset) => void setHome(preset) : null,
            }
          : null
      }
      privacy={masked}
      badge={badge}
      sight={sight}
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
        onRecheck={reloadDevice}
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
  const player =
    playback.file ||
    playback.image ||
    playback.state === 'loading' ||
    playback.state === 'failed' ||
    playback.state === 'unsupported' ? (
      <View className="bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05]">
        {playback.image ? (
          <View className="w-full overflow-hidden rounded-2xl" style={{ aspectRatio: 16 / 9 }}>
            <Image
              source={{ uri: playback.image }}
              resizeMode="contain"
              accessible
              accessibilityLabel={t('screens.cameras.clips.image')}
              accessibilityIgnoresInvertColors
              className="absolute inset-0 h-full w-full"
            />
          </View>
        ) : playback.file ? (
          <ClipPlayer file={playback.file} onEnded={playback.close} />
        ) : (
          <Text variant="caption">
            {playback.state === 'failed'
              ? t('screens.cameras.clips.play-failed')
              : t('screens.cameras.clips.loading')}
          </Text>
        )}
        {playback.state === 'unsupported' ? (
          <Text variant="caption">{t('screens.cameras.clips.unsupported')}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.cameras.clips.close')}
          onPress={playback.close}
          className="items-center rounded-xl py-1 active:opacity-70">
          <Text variant="caption">{t('screens.cameras.clips.close')}</Text>
        </Pressable>
      </View>
    ) : null;

  const clipsPanel = (
    <ClipList
      clips={clipsState.clips}
      recordMode={camera.recordMode}
      status={clipsState.status}
      playable={clipAccess.view}
      removable={clipAccess.remove}
      privacy={masked}
      hasMore={clipsState.hasMore}
      loadingMore={clipsState.loadingMore}
      activeClipId={playback.clip?.id ?? null}
      onOpen={(clip) => playback.open(clip)}
      onDelete={removeClip}
      onLoadMore={clipsState.loadMore}
      className={stretch}
    />
  );

  const sirenPanel =
    camera.isEnabled && (canSiren || siren.sounding) ? (
      <CameraSirenPanel
        controls={siren}
        canSiren={canSiren}
        onActivate={() => {
          siren.ask();
          setSirenOpen(true);
        }}
        className={stretch}
      />
    ) : null;

  const watchPanel = (
    <CameraWatchPanel
      watchman={camera.watchman}
      noAudio={camera.noAudio}
      listening={cameraListening({
        watchman: camera.watchman,
        noAudio: camera.noAudio,
        masked,
        enabled: camera.isEnabled,
        talk: features ? features.talk === true : null,
        household: householdWatchman,
      })}
      editable={canUpdate}
      onChange={(field, value) => void setWatch(camera.id, field, value)}
    />
  );

  const environment = <CameraEnvironmentPanel cameraId={camera.id} className={controllable ? undefined : stretch} />;
  const aimPanel = canUpdate && aimable ? <CameraAimPanel controls={aimControls} /> : null;
  const maintenancePanel = guardAccess.maintenance ? <MaintenancePanel cameraId={camera.id} /> : null;
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
          subtitle={[camera.ip, t(STATUS_LABEL[status])].filter(Boolean).join(' · ')}
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
          <RecordingPausedBanner state={recording} className="mb-5" />
          {masked ? (
            <StatusBadge
              icon="eye-off"
              label={t('screens.cameras.privacy-badge')}
              iconClassName="text-warning-strong"
              textClassName="text-warning-strong"
              className="mb-5"
            />
          ) : null}
          {isExpanded ? (
            <View className="grow flex-row items-stretch gap-6">
              <View className="min-w-0 flex-1 gap-5">
                {live}
                {player}
                {clipsPanel}
                {zonesPanel}
              </View>
              <View className="w-[360px] shrink-0 gap-5">
                {callPanel}
                {sirenPanel}
                {watchPanel}
                {info}
                {environment}
                {maintenancePanel}
                {aimPanel}
                {control}
              </View>
            </View>
          ) : isMedium ? (
            <View className="grow gap-5">
              {live}
              {player}
              {clipsPanel}
              <View className="grow flex-row items-stretch gap-5">
                <View className="min-w-0 flex-1 gap-5">
                  {callPanel}
                  {sirenPanel}
                  {watchPanel}
                  {info}
                  {environment}
                  {maintenancePanel}
                  {control}
                </View>
                <View className="min-w-0 flex-1 gap-5">
                  {aimPanel}
                  {zonesPanel}
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-4">
              {live}
              {player}
              {clipsPanel}
              {callPanel}
              {sirenPanel}
              {watchPanel}
              {info}
              {environment}
              {maintenancePanel}
              {aimPanel}
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
          privacy={masked}
          badge={badge}
        />
      ) : null}
      <CameraForm open={editOpen} onOpenChange={setEditOpen} camera={camera} />
      <CameraTalkSheet open={talkOpen} onOpenChange={setTalkOpen} cameraId={camera.id} />
      <CameraSirenSheet
        open={sirenOpen}
        onOpenChange={setSirenOpen}
        cameraName={camera.name}
        controls={siren}
      />
      <ZoneForm open={zoneOpen} onOpenChange={setZoneOpen} cameraId={camera.id} zone={zone} zones={zones} />
    </AppScreen>
  );
}

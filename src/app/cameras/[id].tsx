import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useAuthStore } from '@/core/stores';
import { cameraControlService } from '@/core/services/camera-control.service';
import { cameraService } from '@/core/services/camera.service';
import { zoneService } from '@/core/services/zone.service';
import type {
  ICameraCapabilities,
  ICameraDetailCache,
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
import { DashboardIconButton, SectionHeading } from '@/shared/components/dashboard';
import { EmptyState, ScreenShell } from '@/shared/components/layout';
import { AdaptiveMenu } from '@/shared/components/ui/adaptive-menu';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { VIEW_CACHE_KEYS } from '@/shared/constants';
import { useViewCacheValue } from '@/shared/hooks/use-cached-rows';
import { usePermissions } from '@/shared/hooks/use-permissions';
import { useWindowClass } from '@/shared/hooks/use-window-class';
import { useTranslation } from '@/shared/hooks/use-translation';
import { screenIn } from '@/shared/libs/animations';
import { confirm } from '@/shared/libs/confirm';
import { toast } from '@/shared/libs/toast';

type CameraAction = 'edit' | 'toggle' | 'delete';

export default function CameraDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authStatus = useAuthStore((state) => state.status);
  const { can } = usePermissions();
  const { isWide } = useWindowClass();
  const [editOpen, setEditOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [zoneId, setZoneId] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [device, setDevice] = useState<ICameraDeviceStatus | null>(null);
  const [features, setFeatures] = useState<ICameraCapabilities | null>(null);
  const [talkOpen, setTalkOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  const detail = useViewCacheValue<ICameraDetailCache>(VIEW_CACHE_KEYS.cameraDetail, id);
  const camera = detail?.camera ?? null;
  const zones = useMemo(() => detail?.zones ?? [], [detail]);
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
        // Turning it off stops the watching, so it is worth a question.
        if (
          camera.isEnabled &&
          !(await confirm({
            title: t('screens.cameras.disable-confirm-title', { name: camera.name }),
            description: t('screens.cameras.disable-confirm-body'),
            intent: 'warning',
          }))
        )
          return;
        const result = await cameraService.update(camera.id, { isEnabled: !camera.isEnabled });
        if (!result.ok) toast.error(t('common.errors.unknown'), result.errors?.message);
        return;
      }
      if (
        !(await confirm({
          title: t('screens.cameras.delete-confirm-title', { name: camera.name }),
          description: t('screens.cameras.delete-confirm-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        }))
      )
        return;

      const result = await cameraService.remove(camera.id);
      if (result.ok) {
        toast.success(t('screens.cameras.removed'));
        router.back();
        return;
      }
      toast.error(t('common.errors.unknown'), result.errors?.message);
    },
    [camera, router, t],
  );

  const readDevice = useCallback(async (): Promise<ICameraDeviceStatus | null> => {
    if (!id) return null;
    const result = await cameraControlService.status(id);
    return result.ok ? (result.info ?? null) : null;
  }, [id]);

  useEffect(() => {
    let active = true;
    void readDevice().then((status) => {
      if (active) setDevice(status);
    });
    return () => {
      active = false;
    };
  }, [readDevice]);

  // Capabilities come from the driver, so the UI offers only what this model
  // can actually do — a generic RTSP camera has no PTZ and no speaker.
  useEffect(() => {
    if (!id) return;
    let active = true;
    void cameraControlService.capabilities(id).then((result) => {
      if (active) setFeatures(result.ok ? (result.info ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [id]);

  const step = useCallback(
    async (angle: number) => {
      if (!id) return;
      setMoving(true);
      const result = await cameraControlService.move(id, { angle });
      setMoving(false);
      if (!result.ok) toast.error(t('screens.cameras.device-offline'), result.errors?.message);
    },
    [id, t],
  );

  const center = useCallback(async () => {
    if (!id) return;
    setMoving(true);
    const result = await cameraControlService.move(id, { x: 0, y: 0 });
    setMoving(false);
    if (!result.ok) toast.error(t('screens.cameras.device-offline'), result.errors?.message);
  }, [id, t]);

  const removeZone = useCallback(
    async (targetId: string, name: string) => {
      if (
        !(await confirm({
          title: t('screens.cameras.delete-zone-confirm', { name }),
          description: t('screens.cameras.delete-zone-body'),
          confirmLabel: t('common.confirm-delete'),
          intent: 'danger',
        }))
      )
        return;

      const result = await zoneService.remove(targetId);
      if (result.ok) toast.success(t('screens.cameras.zone-removed'));
      else toast.error(t('common.errors.unknown'), result.errors?.message);
    },
    [t],
  );

  if (authStatus !== 'signed-in') return <Redirect href="/" />;
  if (!camera) return <Redirect href="/cameras" />;

  return (
    <ScreenShell
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
                    <Text className="text-[15px] font-semibold">
                      {t('screens.cameras.ptz')}
                    </Text>
                    <Text className="text-foreground-secondary text-xs" numberOfLines={1}>
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

            <SectionHeading
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
                        <Icon name="trash" className="text-error size-4" />
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
        onApplied={setDevice}
      />
      <ZoneForm open={zoneOpen} onOpenChange={setZoneOpen} cameraId={camera.id} zone={zone} />
    </ScreenShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-foreground-secondary text-[13px]">{label}</Text>
      <Text className="text-[13px] font-medium">{value}</Text>
    </View>
  );
}

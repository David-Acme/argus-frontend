import { Pressable, View } from 'react-native';
import type { ICameraVideoProfile, IZoneCacheRow } from '@/core/interfaces';
import type { IconName } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraFrameRate } from '@/features/cameras/components/camera-frame-rate';
import { CameraFullscreen } from '@/features/cameras/components/camera-fullscreen';
import { CameraLiveStage, type CameraPtzControls } from '@/features/cameras/components/camera-live-stage';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { CameraZonesOverlay } from '@/features/cameras/components/camera-zones-overlay';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import type { CameraLiveStageState } from '@/features/cameras/hooks/use-camera-live-stage';
import type { CameraQualityControls } from '@/features/cameras/hooks/use-camera-quality';
import type { CameraPreset } from '@/features/cameras/model/camera-presets';

export type CameraPresetControls = {
  presets: readonly CameraPreset[];
  onGoto: (preset: CameraPreset) => void;
  onSave: () => void;
};

type CameraLivePanelProps = {
  cameraId: string;
  enabled: boolean;
  zones: readonly IZoneCacheRow[];
  showZones: boolean;
  quality: CameraQualityControls;
  stage: CameraLiveStageState;
  video: ICameraVideoProfile | null;
  canControl: boolean;
  canEnable: boolean;
  ptz: CameraPtzControls | null;
  presets: CameraPresetControls | null;
  onShowZonesChange: (show: boolean) => void;
  onFrameRate: (fps: number) => void;
  onEnable: () => void;
  className?: string;
};

type CameraLiveFullscreenProps = {
  cameraId: string;
  zones: readonly IZoneCacheRow[];
  showZones: boolean;
  quality: CameraQualityControls;
  ptz: CameraPtzControls | null;
  stage: CameraLiveStageState;
};

type StageViewProps = CameraLiveFullscreenProps & {
  inFullscreen: boolean;
};

type QualitySwitchProps = {
  quality: CameraQualityControls;
};

type ChipProps = {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
};

function Chip({ icon, label, active, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80',
        active ? 'bg-accent-soft' : 'bg-surface-secondary',
      )}>
      <Icon name={icon} className={cn('size-4', active ? 'text-accent-strong' : 'text-muted-foreground')} />
      <Text variant="label" className={active ? 'text-foreground' : 'text-foreground-secondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function QualitySwitch({ quality }: QualitySwitchProps) {
  const { t } = useTranslation();
  return (
    <SegmentedControl
      accessibilityLabel={t('screens.cameras.live.quality')}
      value={quality.quality}
      onChange={quality.choose}
      options={[
        { value: 'main', label: t('screens.cameras.live.quality-main') },
        { value: 'sub', label: t('screens.cameras.live.quality-sub') },
      ]}
    />
  );
}

function StageView({ cameraId, zones, showZones, quality, ptz, stage, inFullscreen }: StageViewProps) {
  return (
    <CameraLiveStage
      cameraId={cameraId}
      quality={quality.quality}
      overlay={showZones ? <CameraZonesOverlay zones={zones} /> : null}
      stats={stage.stats}
      live={stage.live}
      fullscreen={inFullscreen}
      ptz={ptz}
      showPad={stage.showPad}
      fullscreenControls={<QualitySwitch quality={quality} />}
      onStats={stage.handleStats}
      onState={stage.handleState}
      onToggleFullscreen={() => stage.setFullscreen(!inFullscreen)}
    />
  );
}

export function CameraLiveFullscreen(props: CameraLiveFullscreenProps) {
  const { stage } = props;
  return (
    <CameraFullscreen open={stage.fullscreen} onClose={() => stage.setFullscreen(false)}>
      {stage.fullscreen ? <StageView {...props} inFullscreen /> : null}
    </CameraFullscreen>
  );
}

export function CameraLivePanel({
  cameraId,
  enabled,
  zones,
  showZones,
  quality,
  stage,
  video,
  canControl,
  canEnable,
  ptz,
  presets,
  onShowZonesChange,
  onFrameRate,
  onEnable,
  className,
}: CameraLivePanelProps) {
  const { t } = useTranslation();
  const { fullscreen, showPad, stats, setShowPad } = stage;
  const activeZones = zones.filter((zone) => zone.isEnabled).length;

  return (
    <Panel className={cn('gap-3 p-3', className)}>
      {!enabled ? (
        <View
          className="w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
          <CameraLiveStatus state="disabled" painted={false} />
        </View>
      ) : fullscreen ? (
        <View
          className="bg-surface-secondary w-full items-center justify-center rounded-2xl"
          style={{ aspectRatio: 16 / 9 }}>
          <Text variant="caption">{t('screens.cameras.live.in-fullscreen')}</Text>
        </View>
      ) : (
        <StageView
          cameraId={cameraId}
          zones={zones}
          showZones={showZones}
          quality={quality}
          ptz={ptz}
          stage={stage}
          inFullscreen={false}
        />
      )}

      <View className="min-h-10 flex-row flex-wrap items-center gap-2 px-1">
        {enabled && activeZones > 0 ? (
          <Chip
            icon="eye"
            label={`${t('screens.cameras.live.zones')} · ${activeZones}`}
            active={showZones}
            onPress={() => onShowZonesChange(!showZones)}
          />
        ) : null}
        {enabled && ptz ? (
          <Chip icon="move" label={t('screens.cameras.live.move')} active={showPad} onPress={() => setShowPad(!showPad)} />
        ) : null}
        <View className="flex-1" />
        {enabled ? (
          <View className="w-56">
            <QualitySwitch quality={quality} />
          </View>
        ) : canEnable ? (
          <Button size="sm" onPress={onEnable}>
            <Icon name="play" className="text-foreground-on-interactive size-4" />
            <Text>{t('screens.cameras.enable')}</Text>
          </Button>
        ) : null}
      </View>

      {enabled && quality.fellBack ? (
        <View className="bg-surface-secondary flex-row flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
          <Text variant="caption" className="min-w-0 flex-1">
            {t('screens.cameras.live.fell-back')}
          </Text>
          <Button variant="ghost" size="sm" onPress={quality.restore}>
            <Text>{t('screens.cameras.live.restore')}</Text>
          </Button>
        </View>
      ) : null}

      {enabled && presets ? (
        <View className="flex-row flex-wrap items-center gap-2 px-1">
          <Text variant="micro">{t('screens.cameras.presets')}</Text>
          {presets.presets.map((preset) => (
            <Button key={preset.id} variant="outline" size="sm" disabled={ptz?.moving} onPress={() => presets.onGoto(preset)}>
              <Text numberOfLines={1}>{preset.name || preset.id}</Text>
            </Button>
          ))}
          <Button variant="ghost" size="sm" disabled={ptz?.moving} onPress={presets.onSave}>
            <Icon name="plus" className="text-foreground size-4" />
            <Text>{t('screens.cameras.preset-save')}</Text>
          </Button>
        </View>
      ) : null}

      {enabled ? (
        <View className="px-1">
          <CameraFrameRate
            video={video}
            measuredFps={quality.quality === 'main' ? (stats?.fps ?? 0) : 0}
            canChange={canControl}
            onChange={onFrameRate}
          />
        </View>
      ) : null}
    </Panel>
  );
}

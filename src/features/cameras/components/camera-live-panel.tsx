import { Pressable, View } from 'react-native';
import type { IZoneCacheRow } from '@/core/interfaces';
import type { CameraStreamQuality } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Panel } from '@/shared/components/ui/panel';
import { SegmentedControl } from '@/shared/components/ui/segmented-control';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraLiveView } from './camera-live-view';
import { CameraLiveStatus } from '@/features/cameras/components/camera-live-status';
import { CameraZonesOverlay } from '@/features/cameras/components/camera-zones-overlay';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';

type CameraLivePanelProps = {
  cameraId: string;
  enabled: boolean;
  zones: readonly IZoneCacheRow[];
  showZones: boolean;
  quality: CameraStreamQuality;
  canEnable: boolean;
  onShowZonesChange: (show: boolean) => void;
  onQualityChange: (quality: CameraStreamQuality) => void;
  onEnable: () => void;
  className?: string;
};

export function CameraLivePanel({
  cameraId,
  enabled,
  zones,
  showZones,
  quality,
  canEnable,
  onShowZonesChange,
  onQualityChange,
  onEnable,
  className,
}: CameraLivePanelProps) {
  const { t } = useTranslation();
  const activeZones = zones.filter((zone) => zone.isEnabled).length;

  return (
    <Panel className={cn('gap-3 p-3', className)}>
      {enabled ? (
        <CameraLiveView
          cameraId={cameraId}
          quality={quality}
          overlay={showZones ? <CameraZonesOverlay zones={zones} /> : null}
        />
      ) : (
        <View
          className="w-full overflow-hidden rounded-2xl"
          style={{ aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }}>
          <CameraLiveStatus state="disabled" painted={false} />
        </View>
      )}
      <View className="min-h-10 flex-row flex-wrap items-center gap-2 px-1">
        {enabled && activeZones > 0 ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: showZones }}
            accessibilityLabel={t('screens.cameras.live.zones')}
            onPress={() => onShowZonesChange(!showZones)}
            className={cn(
              'flex-row items-center gap-1.5 rounded-full px-3 py-1.5 active:opacity-80',
              showZones ? 'bg-accent-soft' : 'bg-surface-secondary',
            )}>
            <Icon
              name="eye"
              className={cn('size-4', showZones ? 'text-accent-strong' : 'text-muted-foreground')}
            />
            <Text variant="label" className={showZones ? 'text-foreground' : 'text-foreground-secondary'}>
              {`${t('screens.cameras.live.zones')} · ${activeZones}`}
            </Text>
          </Pressable>
        ) : null}
        <View className="flex-1" />
        {enabled ? (
          <View className="w-52">
            <SegmentedControl
              accessibilityLabel={t('screens.cameras.live.quality')}
              value={quality}
              onChange={onQualityChange}
              options={[
                { value: 'sub', label: t('screens.cameras.live.quality-sub') },
                { value: 'main', label: t('screens.cameras.live.quality-main') },
              ]}
            />
          </View>
        ) : canEnable ? (
          <Button size="sm" onPress={onEnable}>
            <Icon name="play" className="text-foreground-on-interactive size-4" />
            <Text>{t('screens.cameras.enable')}</Text>
          </Button>
        ) : null}
      </View>
    </Panel>
  );
}

import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { ICameraLiveStats } from '@/core/interfaces';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraLiveView } from './camera-live-view';
import { PtzPad } from '@/features/cameras/components/ptz-pad';
import { CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';

export type CameraPtzControls = {
  moving: boolean;
  onStep: (direction: number) => void;
  onCenter: () => void;
};

type CameraLiveStageProps = {
  cameraId: string;
  quality: CameraStreamQuality;
  overlay: ReactNode;
  stats: ICameraLiveStats | null;
  live: boolean;
  fullscreen: boolean;
  ptz: CameraPtzControls | null;
  showPad: boolean;
  fullscreenControls?: ReactNode;
  onStats: (stats: ICameraLiveStats) => void;
  onState: (state: CameraStreamState) => void;
  onToggleFullscreen: () => void;
};

export function CameraLiveStage({
  cameraId,
  quality,
  overlay,
  stats,
  live,
  fullscreen,
  ptz,
  showPad,
  fullscreenControls,
  onStats,
  onState,
  onToggleFullscreen,
}: CameraLiveStageProps) {
  const { t } = useTranslation();
  const statsLabel =
    stats && stats.width > 0
      ? stats.fps > 0
        ? t('screens.cameras.live.stats', {
            width: String(stats.width),
            height: String(stats.height),
            fps: String(stats.fps),
          })
        : t('screens.cameras.live.stats-size', { width: String(stats.width), height: String(stats.height) })
      : null;

  return (
    <View
      className={cn('w-full overflow-hidden', fullscreen ? 'flex-1' : 'rounded-2xl')}
      style={
        fullscreen
          ? { backgroundColor: CAMERA_LIVE_BACKGROUND }
          : { aspectRatio: 16 / 9, backgroundColor: CAMERA_LIVE_BACKGROUND }
      }>
      <CameraLiveView
        cameraId={cameraId}
        quality={quality}
        overlay={overlay}
        fill
        compactStatus={false}
        className={fullscreen ? 'rounded-none' : undefined}
        onStats={onStats}
        onState={onState}
      />
      <View pointerEvents="box-none" className="absolute inset-0">
        {live && statsLabel ? (
          <View
            pointerEvents="none"
            className="bg-card/90 absolute right-3 top-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
            <Icon name="gauge" className="text-foreground-secondary size-3.5" />
            <Text variant="micro" className="text-foreground font-semibold">
              {statsLabel}
            </Text>
          </View>
        ) : null}
        {live && ptz && showPad ? (
          <View className="absolute bottom-3 left-3">
            <PtzPad
              compact
              labels={{
                up: t('screens.cameras.ptz-up'),
                down: t('screens.cameras.ptz-down'),
                left: t('screens.cameras.ptz-left'),
                right: t('screens.cameras.ptz-right'),
                center: t('screens.cameras.ptz-center'),
              }}
              disabled={ptz.moving}
              onStep={ptz.onStep}
              onCenter={ptz.onCenter}
            />
          </View>
        ) : null}
        {fullscreen && fullscreenControls ? (
          <View pointerEvents="box-none" className="absolute inset-x-0 bottom-4 items-center">
            <View className="bg-card/90 w-56 rounded-2xl">{fullscreenControls}</View>
          </View>
        ) : null}
        <IconButton
          icon={fullscreen ? 'minimize' : 'maximize'}
          label={fullscreen ? t('screens.cameras.live.exit-fullscreen') : t('screens.cameras.live.fullscreen')}
          onPress={onToggleFullscreen}
          className="bg-card/90 absolute bottom-3 right-3"
        />
      </View>
    </View>
  );
}

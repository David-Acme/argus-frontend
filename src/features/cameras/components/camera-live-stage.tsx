import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ICameraLiveStats } from '@/core/interfaces';
import type { CameraStreamQuality, CameraStreamState } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { CameraLiveView } from './camera-live-view';
import { PtzPad } from '@/features/cameras/components/ptz-pad';
import type { CameraLiveAudio } from '@/features/cameras/hooks/use-camera-live-audio';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import { CAMERA_FULLSCREEN_CONTROLS_HIDE_MS, CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';

type CameraLiveStageProps = {
  cameraId: string;
  quality: CameraStreamQuality;
  overlay: ReactNode;
  stats: ICameraLiveStats | null;
  live: boolean;
  fullscreen: boolean;
  flush?: boolean;
  ptz: CameraPtzControls | null;
  showPad: boolean;
  fullscreenControls?: ReactNode;
  audio: CameraLiveAudio;
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
  flush = false,
  ptz,
  showPad,
  fullscreenControls,
  audio,
  onStats,
  onState,
  onToggleFullscreen,
}: CameraLiveStageProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [controlsShown, setControlsShown] = useState(true);
  const [armed, setArmed] = useState(0);
  const moving = ptz?.moving ?? false;
  const hasAudio = live && stats?.audio === true;
  const silencedByCall = audio.reason === 'argus-call' || audio.reason === 'camera-call';
  const controls = !fullscreen || controlsShown;
  const audioLabel =
    audio.muted || audio.blocked
      ? t('screens.cameras.live.unmute')
      : t('screens.cameras.live.mute');
  const statsLabel =
    stats && stats.width > 0
      ? stats.fps > 0
        ? t('screens.cameras.live.stats', {
            width: String(stats.width),
            height: String(stats.height),
            fps: String(stats.fps),
          })
        : t('screens.cameras.live.stats-size', {
            width: String(stats.width),
            height: String(stats.height),
          })
      : null;

  useEffect(() => {
    if (!fullscreen || !controlsShown || moving) return;
    const timer = setTimeout(() => setControlsShown(false), CAMERA_FULLSCREEN_CONTROLS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [armed, controlsShown, fullscreen, moving]);

  const reveal = () => {
    setArmed((value) => value + 1);
    setControlsShown(true);
  };

  const toggleControls = () => {
    if (controlsShown) setControlsShown(false);
    else reveal();
  };

  return (
    <View
      className={cn(
        'w-full overflow-hidden',
        fullscreen ? 'flex-1' : flush ? 'rounded-t-3xl' : 'rounded-2xl'
      )}
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
        className={fullscreen || flush ? 'rounded-none' : undefined}
        onStats={onStats}
        onState={onState}
        statusHidden={fullscreen && !controlsShown}
        statusInsets={fullscreen ? insets : undefined}
        audioLevel={audio.level}
        audioUnlock={audio.unlockKey}
        onAudioBlocked={audio.setBlocked}
      />
      {fullscreen ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('screens.cameras.live.toggle-controls')}
          onPress={toggleControls}
          className="absolute inset-0"
        />
      ) : null}
      <View
        pointerEvents="box-none"
        onStartShouldSetResponderCapture={() => {
          if (fullscreen) reveal();
          return false;
        }}
        className="absolute"
        style={
          fullscreen
            ? { top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }
            : { top: 0, bottom: 0, left: 0, right: 0 }
        }>
        {controls && live && statsLabel ? (
          <View
            pointerEvents="none"
            accessible
            accessibilityLabel={statsLabel}
            className="bg-card/90 absolute top-3 right-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
            <Icon name="gauge" className="text-foreground-secondary size-3.5" />
            <Text variant="micro" className="text-foreground font-semibold">
              {statsLabel}
            </Text>
          </View>
        ) : null}
        {controls && live && ptz && showPad ? (
          <View className="absolute bottom-3 left-3">
            <PtzPad
              compact
              labels={{
                up: t('screens.cameras.ptz-up'),
                down: t('screens.cameras.ptz-down'),
                left: t('screens.cameras.ptz-left'),
                right: t('screens.cameras.ptz-right'),
              }}
              limit={ptz.limit}
              onStep={ptz.onStep}
              onHoldStart={ptz.onHoldStart}
              onHoldEnd={ptz.onHoldEnd}
            />
          </View>
        ) : null}
        {live && ptz?.limit ? (
          <View pointerEvents="none" className="absolute inset-x-0 top-12 items-center">
            <View className="bg-card/90 flex-row items-center gap-1.5 rounded-full px-3 py-1.5">
              <Icon name="triangle-alert" className="text-foreground-secondary size-3.5" />
              <Text variant="micro" className="text-foreground">
                {t('screens.cameras.ptz-limit')}
              </Text>
            </View>
          </View>
        ) : null}
        {controls && fullscreen && fullscreenControls ? (
          <View pointerEvents="box-none" className="absolute inset-x-0 bottom-4 items-center">
            <View className="bg-card/90 w-56 rounded-2xl">{fullscreenControls}</View>
          </View>
        ) : null}
        {hasAudio && audio.blocked && audio.level > 0 ? (
          <View pointerEvents="box-none" className="absolute inset-0 items-center justify-center">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('screens.cameras.live.tap-for-sound')}
              onPress={audio.unlock}
              className="bg-card/95 flex-row items-center gap-2 rounded-full px-4 py-2.5 shadow-sm shadow-black/[0.12] active:opacity-80">
              <Icon name="volume-2" className="text-foreground size-5" />
              <Text variant="label">{t('screens.cameras.live.tap-for-sound')}</Text>
            </Pressable>
          </View>
        ) : null}
        {controls && hasAudio && silencedByCall && !audio.muted ? (
          <View
            pointerEvents="none"
            className="bg-card/90 absolute right-[116px] bottom-4 flex-row items-center gap-1.5 rounded-full px-2.5 py-1">
            <Icon name="volume-x" className="text-foreground-secondary size-3.5" />
            <Text variant="micro" className="text-foreground">
              {audio.reason === 'argus-call'
                ? t('screens.cameras.live.silenced-argus-call')
                : t('screens.cameras.live.silenced-camera-call')}
            </Text>
          </View>
        ) : null}
        {controls && hasAudio ? (
          <IconButton
            icon={audio.muted || audio.blocked || silencedByCall ? 'volume-x' : 'volume-2'}
            label={audioLabel}
            accessibilityState={{ checked: !audio.muted }}
            onPress={audio.toggle}
            className="bg-card/90 absolute right-16 bottom-3"
          />
        ) : null}
        {controls ? (
          <IconButton
            icon={fullscreen ? 'minimize' : 'maximize'}
            label={
              fullscreen
                ? t('screens.cameras.live.exit-fullscreen')
                : t('screens.cameras.live.fullscreen')
            }
            onPress={onToggleFullscreen}
            className="bg-card/90 absolute right-3 bottom-3"
          />
        ) : null}
      </View>
    </View>
  );
}

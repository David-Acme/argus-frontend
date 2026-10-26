import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { CameraFullscreen } from '@/features/cameras/components/camera-fullscreen';
import { CameraLiveView } from '@/features/cameras/components/players';
import { PtzPad } from '@/features/cameras/components/live/ptz-pad';
import type { CameraPtzControls } from '@/features/cameras/hooks/use-camera-ptz';
import type { LiveStage } from '@/features/cameras/hooks/use-live-stage';
import type { LiveControls } from '@/features/cameras/model/camera-stage';

export type LiveFullscreenProps = {
  cameraId: string;
  live: LiveStage;
  controls: LiveControls;
  ptz: CameraPtzControls | null;
};

const PASS_THROUGH = { pointerEvents: 'box-none' } as const;

export function LiveFullscreen({ cameraId, live, controls, ptz }: LiveFullscreenProps) {
  const { t } = useTranslation();
  const { audio } = live;
  const silent = audio.muted || audio.blocked || audio.level === 0;
  const close = () => live.setFullscreen(false);
  return (
    <CameraFullscreen open={live.fullscreen} onClose={close}>
      {live.fullscreen ? (
        <View className="flex-1">
          <CameraLiveView
            cameraId={cameraId}
            quality={live.quality.quality}
            fill
            className="rounded-none"
            onStatus={live.onStatus}
            onStats={live.onStats}
            onState={live.onState}
            audioLevel={audio.level}
            audioUnlock={audio.unlockKey}
            onAudioBlocked={audio.setBlocked}
          />
          <SafeAreaView className="absolute inset-0" style={PASS_THROUGH}>
            <View className="flex-1" style={PASS_THROUGH}>
              <View className="right-overlay-edge top-overlay-edge absolute">
                <Button
                  iconOnly
                  glass
                  icon="x"
                  label={t('screens.cameras.live.exit-fullscreen')}
                  onPress={close}
                />
              </View>
              {controls.sound ? (
                <View className="right-overlay-edge bottom-overlay-edge absolute">
                  <Button
                    iconOnly
                    glass
                    icon={silent ? 'mute' : 'speaker'}
                    label={
                      silent ? t('screens.cameras.live.unmute') : t('screens.cameras.live.mute')
                    }
                    onPress={audio.toggle}
                  />
                </View>
              ) : null}
              {live.ptzShown && ptz ? <PtzPad ptz={ptz} /> : null}
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </CameraFullscreen>
  );
}

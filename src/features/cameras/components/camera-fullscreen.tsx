import { Portal } from '@rn-primitives/portal';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SystemBars } from 'react-native-edge-to-edge';
import {
  enterWindowFullscreen,
  exitWindowFullscreen,
  onWindowFullscreenExit,
  releaseWindowOrientation,
} from '../services/window-fullscreen';
import { CAMERA_FULLSCREEN_FADE_MS, CAMERA_LIVE_BACKGROUND } from '@/features/cameras/constants';
import { IS_NATIVE } from '@/shared/constants';

type CameraFullscreenProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

const OVERLAY_STYLE = [StyleSheet.absoluteFill, { backgroundColor: CAMERA_LIVE_BACKGROUND }];

export function CameraFullscreen({ open, onClose, children }: CameraFullscreenProps) {
  const close = useEffectEvent(() => onClose());

  useEffect(() => {
    if (!open) return;
    void enterWindowFullscreen();
    const stop = onWindowFullscreenExit(() => close());
    return () => {
      stop();
      void exitWindowFullscreen();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !IS_NATIVE) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [open]);

  useEffect(() => () => void releaseWindowOrientation(), []);

  if (!open) return null;

  return (
    <Portal name="camera-fullscreen">
      {IS_NATIVE ? <SystemBars hidden /> : null}
      <Animated.View entering={FadeIn.duration(CAMERA_FULLSCREEN_FADE_MS)} style={OVERLAY_STYLE}>
        {children}
      </Animated.View>
    </Portal>
  );
}

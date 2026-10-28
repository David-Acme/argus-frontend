import { Portal } from '@rn-primitives/portal';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SystemBars } from 'react-native-edge-to-edge';
import { scheduleOnRN } from 'react-native-worklets';
import {
  enterWindowFullscreen,
  exitWindowFullscreen,
  releaseWindowOrientation,
} from '@/shared/libs/window-fullscreen';
import { illustration, motion } from '@/shared/theme';

export type PlayerFullscreenProps = { open: boolean; onExit: () => void; children: ReactNode };

export const FULLSCREEN_ADOPTS = true;

const STAGE = [StyleSheet.absoluteFill, { backgroundColor: illustration.sceneShade }];

const SWIPE_CLOSE = 80;

export function PlayerFullscreen({ open, onExit, children }: PlayerFullscreenProps) {
  const exit = useEffectEvent(onExit);
  useEffect(() => {
    if (!open) return undefined;
    void enterWindowFullscreen();
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      exit();
      return true;
    });
    return () => {
      back.remove();
      void exitWindowFullscreen();
    };
  }, [open]);
  useEffect(() => () => void releaseWindowOrientation(), []);
  const leave = () => onExit();
  const swipe = Gesture.Pan()
    .activeOffsetY(24)
    .failOffsetX([-24, 24])
    .onEnd((event) => {
      if (event.translationY > SWIPE_CLOSE) scheduleOnRN(leave);
    });
  if (!open) return null;
  return (
    <Portal name="media-player-fullscreen">
      <SystemBars hidden />
      <GestureDetector gesture={swipe}>
        <Animated.View
          entering={FadeIn.duration(motion.duration.base)}
          exiting={FadeOut.duration(motion.duration.fast)}
          style={STAGE}>
          {children}
        </Animated.View>
      </GestureDetector>
    </Portal>
  );
}

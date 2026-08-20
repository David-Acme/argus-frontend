import {
  QR_SCAN_CONVERGE_MS,
  QR_SCAN_CONVERGE_RATIO,
  QR_SCAN_FADE_DELAY_MS,
  QR_SCAN_FADE_MS,
  QR_SCAN_FRAME_BORDER,
  QR_SCAN_FRAME_CORNER_RATIO,
  QR_SCAN_FRAME_RADIUS,
  QR_SCAN_PULSE_MS,
  QR_SCAN_PULSE_SCALE,
} from '@/shared/constants';
import type { QrScanFeedback } from '@/core/types';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type QrGuideFrameProps = {
  size: number;
  feedback: QrScanFeedback;
  reduceMotion: boolean;
};

const CORNER_TONE: Record<QrScanFeedback, string> = {
  requesting: 'border-accent/40',
  searching: 'border-accent/70',
  detected: 'border-accent',
  invalid: 'border-error',
  blocked: 'border-accent/40',
};

const CONVERGE_EASING = Easing.out(Easing.cubic);

function QrGuideFrame({ size, feedback, reduceMotion }: QrGuideFrameProps) {
  const converge = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const corner = Math.round(size * QR_SCAN_FRAME_CORNER_RATIO);
  const travel = size * QR_SCAN_CONVERGE_RATIO;
  const tone = CORNER_TONE[feedback];

  const frameStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const topLeftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: converge.value * travel },
      { translateY: converge.value * travel },
    ],
  }));

  const topRightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -converge.value * travel },
      { translateY: converge.value * travel },
    ],
  }));

  const bottomLeftStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: converge.value * travel },
      { translateY: -converge.value * travel },
    ],
  }));

  const bottomRightStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -converge.value * travel },
      { translateY: -converge.value * travel },
    ],
  }));

  useEffect(() => {
    if (feedback !== 'detected') {
      converge.value = withTiming(0, { duration: QR_SCAN_PULSE_MS });
      opacity.value = withTiming(1, { duration: QR_SCAN_PULSE_MS });
      scale.value = withTiming(1, { duration: QR_SCAN_PULSE_MS });
      return;
    }

    opacity.value = withDelay(
      QR_SCAN_FADE_DELAY_MS,
      withTiming(0, { duration: QR_SCAN_FADE_MS })
    );

    if (reduceMotion) {
      return;
    }

    converge.value = withTiming(1, {
      duration: QR_SCAN_CONVERGE_MS,
      easing: CONVERGE_EASING,
    });
    scale.value = withSequence(
      withTiming(QR_SCAN_PULSE_SCALE, { duration: QR_SCAN_PULSE_MS / 2 }),
      withSpring(1, { damping: 14, stiffness: 200 })
    );
  }, [converge, feedback, opacity, reduceMotion, scale]);

  return (
    <Animated.View
      style={[{ width: size, height: size }, frameStyle]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0 }, topLeftStyle]}>
        <View
          className={tone}
          style={{
            width: corner,
            height: corner,
            borderTopWidth: QR_SCAN_FRAME_BORDER,
            borderLeftWidth: QR_SCAN_FRAME_BORDER,
            borderTopLeftRadius: QR_SCAN_FRAME_RADIUS,
          }}
        />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', top: 0, right: 0 }, topRightStyle]}>
        <View
          className={tone}
          style={{
            width: corner,
            height: corner,
            borderTopWidth: QR_SCAN_FRAME_BORDER,
            borderRightWidth: QR_SCAN_FRAME_BORDER,
            borderTopRightRadius: QR_SCAN_FRAME_RADIUS,
          }}
        />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0 }, bottomLeftStyle]}>
        <View
          className={tone}
          style={{
            width: corner,
            height: corner,
            borderBottomWidth: QR_SCAN_FRAME_BORDER,
            borderLeftWidth: QR_SCAN_FRAME_BORDER,
            borderBottomLeftRadius: QR_SCAN_FRAME_RADIUS,
          }}
        />
      </Animated.View>

      <Animated.View style={[{ position: 'absolute', right: 0, bottom: 0 }, bottomRightStyle]}>
        <View
          className={tone}
          style={{
            width: corner,
            height: corner,
            borderBottomWidth: QR_SCAN_FRAME_BORDER,
            borderRightWidth: QR_SCAN_FRAME_BORDER,
            borderBottomRightRadius: QR_SCAN_FRAME_RADIUS,
          }}
        />
      </Animated.View>
    </Animated.View>
  );
}

export { QrGuideFrame };
export type { QrGuideFrameProps };

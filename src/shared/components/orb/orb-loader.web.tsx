import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { OrbProps } from './orb';

/** Breathing ring shown while CanvasKit loads — matches the shader silhouette. */
function OrbFallback() {
  const pulse = useSharedValue(0);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + pulse.value * 0.1 }],
    opacity: 0.5 + pulse.value * 0.4,
  }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1.05 + pulse.value * 0.16 }],
    opacity: 0.12 + pulse.value * 0.16,
  }));

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);

  return (
    <View className="h-full w-full items-center justify-center">
      <Animated.View className="absolute size-40 rounded-full bg-accent" style={haloStyle} />
      <Animated.View className="absolute size-36 rounded-full border-[6px] border-accent" style={ringStyle} />
    </View>
  );
}

function Orb(props: OrbProps) {
  return (
    <WithSkiaWeb getComponent={() => import('./orb')} fallback={<OrbFallback />} componentProps={props} />
  );
}

export { Orb };
export type { OrbProps };

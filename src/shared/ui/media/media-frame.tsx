import { useEffect, useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { motion, useEffects } from '@/shared/theme';

export type MediaFrameProps = { source: ImageSourcePropType };

type Layers = { back: ImageSourcePropType | null; front: ImageSourcePropType; key: string };

function frameKey(source: ImageSourcePropType): string {
  if (typeof source === 'number') return `asset:${source}`;
  if (Array.isArray(source)) return source.map((entry) => entry.uri ?? '').join('|');
  return source.uri ?? '';
}

export function MediaFrame({ source }: MediaFrameProps) {
  const { reduceMotion } = useEffects();
  const key = frameKey(source);
  const [layers, setLayers] = useState<Layers>({ back: null, front: source, key });
  if (layers.key !== key) setLayers({ back: layers.front, front: source, key });
  const opacity = useSharedValue(1);
  const frontStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const fading = layers.back !== null;
  useEffect(() => {
    if (fading) opacity.set(0);
  }, [fading, layers.key, opacity]);
  const settle = () =>
    setLayers((current) => (current.back ? { ...current, back: null } : current));
  const reveal = () => {
    if (reduceMotion) {
      opacity.set(1);
      settle();
      return;
    }
    opacity.set(
      withTiming(1, { duration: motion.duration.base }, (finished) => {
        if (finished) scheduleOnRN(settle);
      })
    );
  };
  return (
    <View className="absolute inset-0">
      {layers.back ? (
        <Image source={layers.back} resizeMode="cover" className="absolute inset-0" />
      ) : null}
      <Animated.View className="absolute inset-0" style={frontStyle}>
        <Image source={layers.front} resizeMode="cover" className="size-full" onLoad={reveal} />
      </Animated.View>
    </View>
  );
}

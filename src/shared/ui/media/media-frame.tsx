import { useEffect, useState } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { motion, useEffects } from '@/shared/theme';

export type MediaFrameProps = { source: ImageSourcePropType };

type Layers = { back: ImageSourcePropType; front: ImageSourcePropType };

export function MediaFrame({ source }: MediaFrameProps) {
  const { reduceMotion } = useEffects();
  const [layers, setLayers] = useState<Layers>({ back: source, front: source });
  if (layers.front !== source) setLayers({ back: layers.front, front: source });
  const opacity = useSharedValue(1);
  const frontStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  const fading = layers.back !== layers.front;
  useEffect(() => {
    if (fading) opacity.set(0);
  }, [fading, layers.front, opacity]);
  const reveal = () =>
    opacity.set(reduceMotion ? 1 : withTiming(1, { duration: motion.duration.base }));
  return (
    <View className="absolute inset-0">
      {fading ? (
        <Image source={layers.back} resizeMode="cover" className="absolute inset-0" />
      ) : null}
      <Animated.View className="absolute inset-0" style={frontStyle}>
        <Image source={layers.front} resizeMode="cover" className="size-full" onLoad={reveal} />
      </Animated.View>
    </View>
  );
}

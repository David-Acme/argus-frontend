import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type FaceFrameProps = {
  width: number;
  height: number;
  reduceMotion: boolean;
};

/** Face framing guide (ellipse) with a soft pulse. */
function FaceFrame({ width, height, reduceMotion }: FaceFrameProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withTiming(1, {
      duration: 1600,
      easing: Easing.inOut(Easing.sin),
    });
    const id = setInterval(() => {
      pulse.value = withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) });
    }, 1600);
    return () => clearInterval(id);
  }, [pulse, reduceMotion]);

  const glow = useAnimatedStyle(() => ({
    borderColor: `rgba(184, 154, 99, ${0.45 + pulse.value * 0.35})`,
    transform: [{ scale: 0.96 + pulse.value * 0.04 }],
  }));

  return (
    <View
      className="items-center justify-center"
      style={{ width, height, pointerEvents: 'none' }}
      accessible={false}>
      <Animated.View
        style={[
          styles.ellipse,
          glow,
          {
            width: width * 0.72,
            height: height * 0.62,
            borderRadius: (width * 0.72) / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ellipse: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});

export default FaceFrame;
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { MASCOT_ORBIT, MASCOT_STAGE } from '@/features/auth/constants/welcome-mascot';

type OrbitTrackProps = {
  scale: number;
  half: 'back' | 'front';
  shown: boolean;
  dark: boolean;
};

export function OrbitTrack({ scale, half, shown, dark }: OrbitTrackProps) {
  const fade = useSharedValue(shown ? 1 : 0);
  const radiusX = MASCOT_ORBIT.radius;
  const radiusY = MASCOT_ORBIT.radius * MASCOT_ORBIT.tilt;
  const left = MASCOT_STAGE.centerX - radiusX;
  const right = MASCOT_STAGE.centerX + radiusX;
  const middle = MASCOT_STAGE.centerY;
  const arc =
    half === 'back'
      ? `M ${left} ${middle} A ${radiusX} ${radiusY} 0 0 1 ${right} ${middle}`
      : `M ${right} ${middle} A ${radiusX} ${radiusY} 0 0 1 ${left} ${middle}`;
  const style = useAnimatedStyle(() => ({ opacity: fade.value }));

  useEffect(() => {
    fade.value = withTiming(shown ? 1 : 0, { duration: 1200, easing: Easing.out(Easing.quad) });
  }, [fade, shown]);

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: MASCOT_STAGE.width * scale,
          height: MASCOT_STAGE.height * scale,
          zIndex: half === 'back' ? 0 : 2,
        },
        style,
      ]}>
      <Svg
        width={MASCOT_STAGE.width * scale}
        height={MASCOT_STAGE.height * scale}
        viewBox={`0 0 ${MASCOT_STAGE.width} ${MASCOT_STAGE.height}`}>
        <Path
          d={arc}
          fill="none"
          stroke={dark ? 'rgba(217, 188, 133, 0.3)' : 'rgba(131, 106, 60, 0.3)'}
          strokeWidth={1.5}
          strokeDasharray="4 6"
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}

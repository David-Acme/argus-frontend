import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, ClipPath, G, Path } from 'react-native-svg';
import {
  MASCOT_COLORS,
  MASCOT_HAT_PIVOT,
  MASCOT_LENS_BOX,
  MASCOT_UNITS,
} from '@/features/auth/constants/welcome-mascot';

const HAT_DOME = 'M60 37 C60 18 78 6 99 6 C120 6 138 18 138 37 C120 41 78 41 60 37 Z';
const HAT_FLAP_LEFT = 'M66 31 C64 23 69 16 76 15 C74 21 72 27 72 34 Z';
const HAT_FLAP_RIGHT = 'M132 31 C134 23 129 16 122 15 C124 21 126 27 126 34 Z';
const HAT_BRIM_BACK = 'M60 36 C51 37 45 40 42 45 C53 46 63 43 69 38 Z';
const HAT_BRIM_FRONT = 'M138 36 C147 37 154 41 158 46 C146 47 135 43 129 38 Z';
const HAT_BAND = 'M60 33 C80 37 118 37 138 33 L138 37 C118 41 80 41 60 37 Z';
const TWEED_LINES = [
  ...Array.from({ length: 15 }, (_, index) => `M${57 + index * 6} 4V42`),
  ...Array.from({ length: 7 }, (_, index) => `M56 ${5 + index * 6}H142`),
].join(' ');

export type PropMotion = {
  x: SharedValue<number>;
  y: SharedValue<number>;
  angle: SharedValue<number>;
  scale: SharedValue<number>;
};

type MascotHatProps = {
  unit: number;
  motion: PropMotion;
  visible: boolean;
  layer: 'back' | 'front';
  sway?: SharedValue<number>;
};

type MascotLensProps = {
  unit: number;
  motion: PropMotion;
  visible: boolean;
  dark: boolean;
};

export function MascotHat({ unit, motion, visible, layer, sway }: MascotHatProps) {
  const size = MASCOT_UNITS * unit;
  const tweed = `argus-mascot-tweed-${layer}`;
  const moveStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: motion.x.value * unit },
      { translateY: motion.y.value * unit },
      { rotate: `${motion.angle.value}deg` },
      { scale: motion.scale.value },
    ],
  }));
  const swayStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway ? sway.value : 0}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: size,
          height: size,
          opacity: visible ? 1 : 0,
          transformOrigin: [MASCOT_HAT_PIVOT.x * unit, MASCOT_HAT_PIVOT.y * unit, 0],
        },
        moveStyle,
      ]}>
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          {
            width: size,
            height: size,
            transformOrigin: [MASCOT_HAT_PIVOT.x * unit, (MASCOT_HAT_PIVOT.y + 2) * unit, 0],
          },
          swayStyle,
        ]}>
        <Svg width={size} height={size} viewBox={`0 0 ${MASCOT_UNITS} ${MASCOT_UNITS}`}>
          <ClipPath id={tweed}>
            <Path d={HAT_DOME} />
            <Path d={HAT_FLAP_LEFT} />
            <Path d={HAT_FLAP_RIGHT} />
          </ClipPath>
          <G rotation={-8} originX={100} originY={32}>
            <Path d={HAT_BRIM_BACK} fill={MASCOT_COLORS.tweedLine} />
            <Path d={HAT_BRIM_FRONT} fill={MASCOT_COLORS.tweedLine} />
            <Path
              d={HAT_DOME}
              fill={MASCOT_COLORS.tweed}
              stroke={MASCOT_COLORS.band}
              strokeWidth={1.4}
            />
            <Path
              d={HAT_FLAP_LEFT}
              fill={MASCOT_COLORS.tweed}
              stroke={MASCOT_COLORS.band}
              strokeWidth={1}
            />
            <Path
              d={HAT_FLAP_RIGHT}
              fill={MASCOT_COLORS.tweed}
              stroke={MASCOT_COLORS.band}
              strokeWidth={1}
            />
            <G clipPath={`url(#${tweed})`}>
              <Path
                d={TWEED_LINES}
                stroke={MASCOT_COLORS.tweedLine}
                strokeWidth={1.2}
                opacity={0.6}
              />
            </G>
            <Path d={HAT_BAND} fill={MASCOT_COLORS.band} />
            <Path
              d="M93 8 C88 3 85 10 93 10 M105 8 C110 3 113 10 105 10"
              stroke={MASCOT_COLORS.band}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
            <Circle cx={99} cy={9} r={2.6} fill={MASCOT_COLORS.band} />
            <Path
              d="M73 21 C81 13 92 10 102 10"
              stroke="#FFFFFF"
              strokeWidth={2.5}
              opacity={0.25}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export function MascotLens({ unit, motion, visible, dark }: MascotLensProps) {
  const box = MASCOT_LENS_BOX;
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: (motion.x.value - box.gripX) * unit },
      { translateY: (motion.y.value - box.gripY) * unit },
      { rotate: `${motion.angle.value}deg` },
      { scale: motion.scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: box.width * unit,
          height: box.height * unit,
          opacity: visible ? 1 : 0,
          transformOrigin: [box.gripX * unit, box.gripY * unit, 0],
        },
        style,
      ]}>
      <Svg
        width={box.width * unit}
        height={box.height * unit}
        viewBox={`${-box.gripX} ${-box.gripY} ${box.width} ${box.height}`}>
        <Path
          d="M0 0 L0 -19"
          stroke={dark ? MASCOT_COLORS.handleDark : MASCOT_COLORS.handle}
          strokeWidth={6.5}
          strokeLinecap="round"
        />
        <Path
          d="M0 -2 L0 -17"
          stroke="#836A3C"
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.7}
        />
        <Circle
          cx={0}
          cy={-34}
          r={15}
          fill={MASCOT_COLORS.glass}
          stroke={dark ? MASCOT_COLORS.ringDark : MASCOT_COLORS.ring}
          strokeWidth={4}
        />
        <Path
          d="M-9 -40 A11 11 0 0 1 -1 -45"
          stroke="#FFFFFF"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
      </Svg>
    </Animated.View>
  );
}

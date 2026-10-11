import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import {
  MASCOT_BODY_PATH,
  MASCOT_COLORS,
  MASCOT_RIM_PATH,
  MASCOT_SHINE_PATH,
  MASCOT_SHINE_SHIFT,
  MASCOT_UNITS,
} from '@/features/auth/constants/welcome-mascot';

type Direction = { x: number; y: number };

type MascotBodyProps = {
  size: number;
  direction: SharedValue<Direction>;
  attend: SharedValue<number>;
};

const LAYER = { position: 'absolute', left: 0, top: 0 } as const;

export function MascotBody({ size, direction, attend }: MascotBodyProps) {
  const unit = size / MASCOT_UNITS;
  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -direction.value.x * MASCOT_SHINE_SHIFT * attend.value * unit },
      { translateY: -direction.value.y * MASCOT_SHINE_SHIFT * attend.value * unit },
    ],
  }));

  return (
    <View pointerEvents="none" style={[LAYER, { width: size, height: size }]}>
      <View renderToHardwareTextureAndroid style={[LAYER, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${MASCOT_UNITS} ${MASCOT_UNITS}`}>
          <RadialGradient
            id="argus-mascot-body"
            cx={86}
            cy={66}
            r={128}
            gradientUnits="userSpaceOnUse">
            <Stop offset={0} stopColor="#FFFFFF" />
            <Stop offset={0.5} stopColor="#F4F6FA" />
            <Stop offset={1} stopColor={MASCOT_COLORS.bodyEdge} />
          </RadialGradient>
          <Path d={MASCOT_RIM_PATH} fill={MASCOT_COLORS.rim} opacity={0.82} />
          <Path
            d={MASCOT_BODY_PATH}
            fill="url(#argus-mascot-body)"
            stroke={MASCOT_COLORS.outline}
            strokeWidth={1.2}
          />
        </Svg>
      </View>
      <Animated.View
        renderToHardwareTextureAndroid
        style={[LAYER, { width: size, height: size }, shineStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${MASCOT_UNITS} ${MASCOT_UNITS}`}>
          <RadialGradient id="argus-mascot-glow" cx={0.5} cy={0.5} r={0.5}>
            <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.9} />
            <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="argus-mascot-shade" cx={0.5} cy={0.5} r={0.5}>
            <Stop offset={0} stopColor="#B9C3D3" stopOpacity={0.4} />
            <Stop offset={1} stopColor="#B9C3D3" stopOpacity={0} />
          </RadialGradient>
          <Ellipse cx={82} cy={64} rx={32} ry={22} fill="url(#argus-mascot-glow)" />
          <Ellipse cx={120} cy={128} rx={36} ry={16} fill="url(#argus-mascot-shade)" />
        </Svg>
      </Animated.View>
      <View style={[LAYER, { width: size, height: size }]}>
        <Svg width={size} height={size} viewBox={`0 0 ${MASCOT_UNITS} ${MASCOT_UNITS}`}>
          <Path d={MASCOT_SHINE_PATH} fill="#FFFFFF" opacity={0.35} />
        </Svg>
      </View>
    </View>
  );
}

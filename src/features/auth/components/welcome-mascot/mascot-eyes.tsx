import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  MASCOT_COLORS,
  MASCOT_EYES,
  MASCOT_GLANCE,
  MASCOT_TIMING,
  type EyePreset,
  type MascotExpression,
} from '@/features/auth/constants/welcome-mascot';

const EYE_BOX = { width: 20, height: 44 } as const;

type MascotEyesProps = {
  unit: number;
  expression: MascotExpression;
  still: boolean;
};

type EyeProps = {
  unit: number;
  offset: 0 | 5;
  from: SharedValue<readonly number[]>;
  to: SharedValue<readonly number[]>;
  progress: SharedValue<number>;
  blink: SharedValue<number>;
};

type BlushProps = {
  unit: number;
  left: number;
  smile: SharedValue<number>;
};

function blend(
  from: readonly number[],
  to: readonly number[],
  progress: number,
  index: number
): number {
  'worklet';
  const start = from[index] ?? 0;
  const end = to[index] ?? start;
  return start + (end - start) * progress;
}

function Eye({ unit, offset, from, to, progress, blink }: EyeProps) {
  const frameStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const x = blend(from.value, to.value, p, offset);
    const y = blend(from.value, to.value, p, offset + 1);
    const width = blend(from.value, to.value, p, offset + 2);
    const height = blend(from.value, to.value, p, offset + 3);
    const tilt = blend(from.value, to.value, p, offset + 4);
    return {
      transform: [
        { translateX: (x - EYE_BOX.width / 2) * unit },
        { translateY: (y - EYE_BOX.height / 2) * unit },
        { rotate: `${tilt}deg` },
        { scaleX: width / EYE_BOX.width },
        { scaleY: height / EYE_BOX.height },
      ],
    };
  });
  const blinkStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const pupilStyle = useAnimatedStyle(() => {
    const roundness = blend(from.value, to.value, progress.value, 10);
    const radius = (EYE_BOX.width / 2) * unit;
    return {
      borderBottomLeftRadius: radius * roundness,
      borderBottomRightRadius: radius * roundness,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          top: 0,
          width: EYE_BOX.width * unit,
          height: EYE_BOX.height * unit,
        },
        frameStyle,
      ]}>
      <Animated.View style={[{ flex: 1 }, blinkStyle]}>
        <Animated.View
          style={[
            {
              flex: 1,
              backgroundColor: MASCOT_COLORS.ink,
              borderTopLeftRadius: (EYE_BOX.width / 2) * unit,
              borderTopRightRadius: (EYE_BOX.width / 2) * unit,
            },
            pupilStyle,
          ]}
        />
      </Animated.View>
    </Animated.View>
  );
}

function Blush({ unit, left, smile }: BlushProps) {
  const style = useAnimatedStyle(() => ({
    opacity: smile.value * 0.55,
    transform: [{ scale: 0.6 + smile.value * 0.4 }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: left * unit,
          top: 102 * unit,
          width: 24 * unit,
          height: 11 * unit,
          borderRadius: 12 * unit,
          backgroundColor: MASCOT_COLORS.blush,
        },
        style,
      ]}
    />
  );
}

export function MascotEyes({ unit, expression, still }: MascotEyesProps) {
  const from = useSharedValue<readonly number[]>(MASCOT_EYES[expression]);
  const to = useSharedValue<readonly number[]>(MASCOT_EYES[expression]);
  const progress = useSharedValue(1);
  const blink = useSharedValue(1);
  const smile = useSharedValue(expression === 'smile' ? 1 : 0);
  const glanceX = useSharedValue(0);
  const glanceY = useSharedValue(0);
  const glanceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glanceX.value * unit }, { translateY: glanceY.value * unit }],
  }));

  useEffect(() => {
    const target: EyePreset = MASCOT_EYES[expression];
    const current = target.map((_, index) => blend(from.value, to.value, progress.value, index));
    from.value = current;
    to.value = target;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: still ? 0 : MASCOT_TIMING.expression,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
    blink.value = 1;
    smile.value = withTiming(expression === 'smile' ? 1 : 0, { duration: still ? 0 : 400 });
  }, [blink, expression, from, progress, smile, still, to]);

  useEffect(() => {
    if (still || expression !== 'neutral') return;
    const timer = setInterval(() => {
      blink.value = withSequence(
        withTiming(0.08, { duration: 110, easing: Easing.in(Easing.quad) }),
        withTiming(1, { duration: 130, easing: Easing.out(Easing.quad) })
      );
    }, MASCOT_TIMING.blinkEvery);
    return () => clearInterval(timer);
  }, [blink, expression, still]);

  useEffect(() => {
    const settle = { duration: 160, easing: Easing.out(Easing.quad) };
    if (still || expression !== 'neutral') {
      glanceX.value = withTiming(0, settle);
      glanceY.value = withTiming(0, settle);
      return;
    }
    const timer = setInterval(() => {
      glanceX.value = withTiming((Math.random() * 2 - 1) * MASCOT_GLANCE.reachX, settle);
      glanceY.value = withTiming((Math.random() * 2 - 1) * MASCOT_GLANCE.reachY, settle);
    }, MASCOT_GLANCE.everyMs);
    return () => clearInterval(timer);
  }, [expression, glanceX, glanceY, still]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, glanceStyle]}>
      <Eye unit={unit} offset={0} from={from} to={to} progress={progress} blink={blink} />
      <Eye unit={unit} offset={5} from={from} to={to} progress={progress} blink={blink} />
      <Blush unit={unit} left={52} smile={smile} />
      <Blush unit={unit} left={126} smile={smile} />
    </Animated.View>
  );
}

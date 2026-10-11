import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  MASCOT_ARM,
  MASCOT_ARM_POSES,
  MASCOT_COLORS,
  MASCOT_GAZE_UNITS,
  MASCOT_HAT_POSES,
  MASCOT_LEAN,
  MASCOT_LENS_POSES,
  MASCOT_ORBIT,
  MASCOT_TIMING,
  MASCOT_UNITS,
  MASCOT_WAVE,
  type LimbPose,
  type PropPose,
} from '@/features/auth/constants/welcome-mascot';
import type { HatStage, LensStage, MascotPose } from '@/features/auth/model/welcome-choreography';
import { MascotBody } from './mascot-body';
import { MascotEyes } from './mascot-eyes';
import { MascotHat, MascotLens, type PropMotion } from './mascot-props';

type Direction = { x: number; y: number };

type MascotFigureProps = {
  unit: number;
  pose: MascotPose;
  still: boolean;
  dark: boolean;
  direction: SharedValue<Direction>;
  attend: SharedValue<number>;
};

type MascotArmProps = {
  unit: number;
  side: 'left' | 'right';
  angle: SharedValue<number>;
  reach: SharedValue<number>;
};

const LIMB_EASING = Easing.bezier(0.5, -0.32, 0.3, 1.32);
const SLIDE_EASING = Easing.bezier(0.45, 0, 0.25, 1);
const ARC_EASING = Easing.bezier(0.3, 1.45, 0.5, 1);

const HOP_STEPS = [0, 0.1, 0.22, 0.34, 0.46, 0.58, 0.72, 0.86, 1];
const HOP_LIFT = [0, 0, -14, 0, -9, 0, -3, 0, 0];
const HOP_WIDE = [1, 1.08, 0.94, 1.07, 0.96, 1.05, 1, 1.02, 1];
const HOP_TALL = [1, 0.92, 1.07, 0.93, 1.05, 0.95, 1, 0.98, 1];
const ARRIVE_STEPS = [0, 0.55, 0.75, 0.9, 1];
const ARRIVE_LIFT = [150, -10, 0, 0, 0];
const ARRIVE_WIDE = [0.4, 0.92, 1.12, 0.97, 1];
const ARRIVE_TALL = [0.4, 1.1, 0.88, 1.03, 1];
const JELLY_STEPS = [0, 0.18, 0.38, 0.58, 0.78, 1];
const JELLY_WIDE = [1, 1.03, 0.982, 1.012, 0.996, 1];
const JELLY_TALL = [1, 0.97, 1.018, 0.988, 1.004, 1];

function hatPose(stage: HatStage): PropPose {
  if (stage === 'on') return MASCOT_HAT_POSES.on;
  if (stage === 'above' || stage === 'aboveFront') return MASCOT_HAT_POSES.above;
  return MASCOT_HAT_POSES.hide;
}

function lensPose(stage: LensStage): PropPose {
  if (stage === 'lift') return MASCOT_LENS_POSES.lift;
  if (stage === 'emerge' || stage === 'side') return MASCOT_LENS_POSES.side;
  return MASCOT_LENS_POSES.hide;
}

function useLimb(initial: LimbPose) {
  return { angle: useSharedValue(initial.angle), reach: useSharedValue(initial.reach) };
}

function useMotion(initial: PropPose): PropMotion {
  return {
    x: useSharedValue(initial.x),
    y: useSharedValue(initial.y),
    angle: useSharedValue(initial.angle),
    scale: useSharedValue(initial.scale),
  };
}

function moveLimb(
  limb: { angle: SharedValue<number>; reach: SharedValue<number> },
  target: LimbPose,
  instant: boolean
) {
  const config = { duration: instant ? 0 : MASCOT_TIMING.move, easing: LIMB_EASING };
  limb.angle.value = withTiming(target.angle, config);
  limb.reach.value = withTiming(target.reach, config);
}

function moveProp(motion: PropMotion, target: PropPose, instant: boolean) {
  const duration = instant ? 0 : MASCOT_TIMING.move + 100;
  motion.x.value = withTiming(target.x, { duration, easing: SLIDE_EASING });
  motion.y.value = withTiming(target.y, { duration, easing: ARC_EASING });
  motion.angle.value = withTiming(target.angle, { duration, easing: ARC_EASING });
  motion.scale.value = withTiming(target.scale, { duration, easing: ARC_EASING });
}

function MascotArm({ unit, side, angle, reach }: MascotArmProps) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }, { scaleY: reach.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: (side === 'left' ? MASCOT_ARM.leftX : MASCOT_ARM.rightX) * unit,
          top: MASCOT_ARM.top * unit,
          width: MASCOT_ARM.width * unit,
          height: MASCOT_ARM.height * unit,
          borderRadius: (MASCOT_ARM.width / 2) * unit,
          backgroundColor: '#EEF1F6',
          borderWidth: 1,
          borderColor: MASCOT_COLORS.outline,
          transformOrigin: [(MASCOT_ARM.width / 2) * unit, MASCOT_ARM.pivot * unit, 0],
        },
        style,
      ]}
    />
  );
}

export function MascotFigure({ unit, pose, still, dark, direction, attend }: MascotFigureProps) {
  const size = MASCOT_UNITS * unit;
  const pixel = unit / 0.84;
  const left = useLimb(MASCOT_ARM_POSES.left.rest);
  const right = useLimb(MASCOT_ARM_POSES.right.rest);
  const hat = useMotion(still ? MASCOT_HAT_POSES.on : MASCOT_HAT_POSES.hide);
  const lens = useMotion(still ? MASCOT_LENS_POSES.side : MASCOT_LENS_POSES.hide);
  const sway = useSharedValue(0);
  const arrive = useSharedValue(still ? 1 : 0);
  const breath = useSharedValue(0.5);
  const hop = useSharedValue(1);
  const jelly = useSharedValue(1);
  const squish = useSharedValue(1);

  const bodyStyle = useAnimatedStyle(() => {
    const a = arrive.value;
    const h = hop.value;
    const j = jelly.value;
    const s = squish.value;
    const b = breath.value;
    const wide =
      interpolate(a, ARRIVE_STEPS, ARRIVE_WIDE) *
      interpolate(h, HOP_STEPS, HOP_WIDE) *
      interpolate(j, JELLY_STEPS, JELLY_WIDE) *
      interpolate(s, [0, 0.4, 1], [1, 1.04, 1]) *
      (0.985 + b * 0.033);
    const tall =
      interpolate(a, ARRIVE_STEPS, ARRIVE_TALL) *
      interpolate(h, HOP_STEPS, HOP_TALL) *
      interpolate(j, JELLY_STEPS, JELLY_TALL) *
      interpolate(s, [0, 0.4, 1], [1, 0.96, 1]) *
      (1.018 - b * 0.033);
    const lift =
      interpolate(a, ARRIVE_STEPS, ARRIVE_LIFT) +
      interpolate(h, HOP_STEPS, HOP_LIFT) +
      (-4 + b * 7);
    return {
      opacity: interpolate(a, [0, 0.3], [0, 1], 'clamp'),
      transform: [
        { translateY: lift * pixel },
        { rotate: `${interpolate(s, [0, 0.4, 1], [0, 1.5, 0])}deg` },
        { scaleX: wide },
        { scaleY: tall },
      ],
    };
  });
  const leanStyle = useAnimatedStyle(() => {
    const across = direction.value.x * attend.value;
    const depth = (direction.value.y / MASCOT_ORBIT.tilt) * attend.value;
    return {
      transform: [
        { perspective: MASCOT_LEAN.perspective },
        { rotateY: `${across * MASCOT_LEAN.turn}deg` },
        { rotateX: `${-depth * MASCOT_LEAN.nod}deg` },
        { rotate: `${across * MASCOT_LEAN.tilt}deg` },
      ],
    };
  });
  const gazeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: direction.value.x * MASCOT_GAZE_UNITS * attend.value * unit },
      { translateY: direction.value.y * MASCOT_GAZE_UNITS * attend.value * unit },
    ],
  }));

  useEffect(() => {
    if (still) {
      cancelAnimation(breath);
      breath.value = 0.5;
      arrive.value = 1;
      return;
    }
    arrive.value = withTiming(1, { duration: MASCOT_TIMING.arrive, easing: Easing.linear });
    breath.value = withRepeat(
      withTiming(1, { duration: MASCOT_TIMING.breath, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      -1,
      true
    );
  }, [arrive, breath, still]);

  useEffect(() => {
    if (pose.greeting && !still) {
      const step = MASCOT_TIMING.wave / MASCOT_WAVE.length;
      left.angle.value = withSequence(
        ...MASCOT_WAVE.map((target) =>
          withTiming(target.angle, { duration: step, easing: Easing.inOut(Easing.quad) })
        )
      );
      left.reach.value = withSequence(
        ...MASCOT_WAVE.map((target) =>
          withTiming(target.reach, { duration: step, easing: Easing.inOut(Easing.quad) })
        )
      );
      hop.value = 0;
      hop.value = withTiming(1, { duration: MASCOT_TIMING.wave, easing: Easing.linear });
      return;
    }
    moveLimb(left, MASCOT_ARM_POSES.left[pose.leftArm], still);
  }, [hop, left, pose.greeting, pose.leftArm, still]);

  useEffect(() => {
    moveLimb(right, MASCOT_ARM_POSES.right[pose.rightArm], still);
  }, [pose.rightArm, right, still]);

  useEffect(() => {
    moveProp(hat, hatPose(pose.hat), still || pose.hat === 'none');
  }, [hat, pose.hat, still]);

  useEffect(() => {
    moveProp(lens, lensPose(pose.lens), still || pose.lens === 'none');
  }, [lens, pose.lens, still]);

  useEffect(() => {
    if (!pose.pulling || still) return;
    squish.value = 0;
    squish.value = withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) });
  }, [pose.pulling, squish, still]);

  useEffect(() => {
    if (pose.wobble === 0 || still) return;
    jelly.value = 0;
    jelly.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.quad) });
    sway.value = withSequence(
      withTiming(-5, { duration: 200 }),
      withTiming(3.5, { duration: 220 }),
      withTiming(-1.6, { duration: 220 }),
      withTiming(0, { duration: 300 })
    );
  }, [jelly, pose.wobble, still, sway]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { width: size, height: size, transformOrigin: [size / 2, size * 0.92, 0] },
        bodyStyle,
      ]}>
      <Animated.View
        style={[
          { width: size, height: size, transformOrigin: [size / 2, size * 0.8, 0] },
          leanStyle,
        ]}>
        <MascotHat
          unit={unit}
          motion={hat}
          visible={pose.hat === 'hide' || pose.hat === 'above'}
          layer="back"
        />
        <MascotLens
          unit={unit}
          motion={lens}
          visible={pose.lens === 'hide' || pose.lens === 'emerge'}
          dark={dark}
        />
        <MascotArm unit={unit} side="left" angle={left.angle} reach={left.reach} />
        <MascotArm unit={unit} side="right" angle={right.angle} reach={right.reach} />
        <MascotBody size={size} direction={direction} attend={attend} />
        <View
          style={{
            position: 'absolute',
            left: 64 * unit,
            top: 36.5 * unit,
            width: 72 * unit,
            height: 9 * unit,
            borderRadius: 36 * unit,
            backgroundColor: MASCOT_COLORS.rim,
            opacity: pose.hat === 'on' ? 0.7 : 0,
          }}
        />
        <MascotHat
          unit={unit}
          motion={hat}
          visible={pose.hat === 'aboveFront' || pose.hat === 'on'}
          layer="front"
          sway={sway}
        />
        <Animated.View
          style={[{ position: 'absolute', left: 0, top: 0, width: size, height: size }, gazeStyle]}>
          <MascotEyes unit={unit} expression={pose.expression} still={still} />
          <View style={{ position: 'absolute', left: 0, top: 0, width: size, height: size }}>
            <MascotLens
              unit={unit}
              motion={lens}
              visible={pose.lens === 'side' || pose.lens === 'lift'}
              dark={dark}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

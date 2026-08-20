import type { AvatarExpression, AvatarState } from '@/core/types';
import { useAvatarStore } from '@/core/stores';
import {
  AVATAR_PALETTE,
  AVATAR_PREVIEW_EXPRESSIONS,
  AVATAR_PREVIEW_INTERVAL_MS,
  AVATAR_STATE_PARAMS,
  AVATAR_TRANSITION_MS,
  AVATAR_TRANSITION_SPEAKING_MS,
  AVATAR_VIEWBOX,
  REACTION_SEMANTIC_KEY,
  VOICE_ENVELOPE_MOTION_GAIN,
  VOICE_ENVELOPE_PEAK_GAIN,
  getAvatarExpressionBySemanticKey,
  getAvatarSurface,
} from '@/shared/constants';
import { voiceLevel } from '@/shared/libs/voice-level';
import { computeAvatarGeometry } from '@/shared/libs/avatar-geometry';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useUniwind } from 'uniwind';
import { useEffect, useMemo, useState } from 'react';
import Animated, {
  Easing,
  withDelay,
  useAnimatedProps,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const AVATAR_MOTION_RESET_MS = 140;
const AVATAR_MOTION_SETTLE_MS = 140;
const AVATAR_MOTION_RAMP_MS = 180;
const AVATAR_SURFACE_LEAD_MS = 120;

type AvatarProps = {
  size?: number;
  /** Overrides the store state (e.g. onboarding intro). */
  state?: AvatarState;
  /** Cycles the complete calibrated expression catalog for visual QA. */
  preview?: boolean;
  previewIntervalMs?: number;
  accessibilityLabel?: string;
};

export type { AvatarProps };

const motionCode = (motion: AvatarExpression['eyeMotion'] | AvatarExpression['bodyMotion']) =>
  motion === 'slowDrift' || motion === 'microSaccades' ? 1 : motion === 'shake' ? 2 : 0;

/**
 * Native renderer for the reference-style avatar. The face remains a simple
 * centered blob; calibrated values only control the two rounded eye shapes,
 * pose and motion. This keeps the same model on Android, iOS and web.
 */
export default function Avatar({
  size = 220,
  state,
  preview = false,
  previewIntervalMs = AVATAR_PREVIEW_INTERVAL_MS,
  accessibilityLabel,
}: AvatarProps) {
  const storeState = useAvatarStore(s => s.state);
  const reaction = useAvatarStore(s => s.reaction);
  const reactionIntensity = useAvatarStore(s => s.intensity);
  const reduceMotion = useReduceMotion();
  const { theme } = useUniwind();
  const [previewIndex, setPreviewIndex] = useState(0);

  const current: AvatarState = state ?? storeState;
  const palette = AVATAR_PALETTE[theme === 'dark' ? 'dark' : 'light'];
  const geometry = useMemo(() => computeAvatarGeometry(), []);
  const previewPreset = preview ? AVATAR_PREVIEW_EXPRESSIONS[previewIndex] : undefined;
  const reactionExpression = getAvatarExpressionBySemanticKey(
    REACTION_SEMANTIC_KEY[reaction]
  );
  const target =
    previewPreset?.expression ?? reactionExpression ?? AVATAR_STATE_PARAMS[current];
  const targetSurface = useMemo(
    () => previewPreset?.surface ?? getAvatarSurface(target),
    [previewPreset, target],
  );

  useEffect(() => {
    if (!preview) return;
    const timer = setInterval(() => {
      setPreviewIndex(index => (index + 1) % AVATAR_PREVIEW_EXPRESSIONS.length);
    }, previewIntervalMs);
    return () => clearInterval(timer);
  }, [preview, previewIntervalMs]);

  const headXSV = useSharedValue(target.headX);
  const headYSV = useSharedValue(target.headY);
  const headZSV = useSharedValue(target.headZ);
  const widthLSV = useSharedValue(target.widthLeft);
  const widthRSV = useSharedValue(target.widthRight);
  const heightLSV = useSharedValue(target.heightLeft);
  const heightRSV = useSharedValue(target.heightRight);
  const spacingSV = useSharedValue(target.spacing);
  const positionXLSV = useSharedValue(target.positionXLeft);
  const positionXRSV = useSharedValue(target.positionXRight);
  const positionYLSV = useSharedValue(target.positionYLeft);
  const positionYRSV = useSharedValue(target.positionYRight);
  const leftAngleSV = useSharedValue(target.leftAngle);
  const rightAngleSV = useSharedValue(target.rightAngle);
  const perspectiveSV = useSharedValue(target.perspective);
  const eyeMotionSV = useSharedValue(motionCode(target.eyeMotion));
  const bodyMotionSV = useSharedValue(motionCode(target.bodyMotion));

  const faceColorSV = useSharedValue(targetSurface.face);
  const shadowColorSV = useSharedValue(targetSurface.shadow);
  const highlightColorSV = useSharedValue(targetSurface.highlight);
  const inkColorSV = useSharedValue(targetSurface.ink);

  const bodyOffsetXSV = useSharedValue(0);
  const bodyOffsetYSV = useSharedValue(0);
  const eyeOffsetXSV = useSharedValue(0);
  const eyeOffsetYSV = useSharedValue(0);
  const ambientRotationSV = useSharedValue(0);
  const bobOffsetSV = useSharedValue(0);
  const motionStrengthSV = useSharedValue(0);

  useEffect(() => {
    const duration = current === 'speaking' ? AVATAR_TRANSITION_SPEAKING_MS : AVATAR_TRANSITION_MS;
    const timing = {
      duration: reduceMotion ? 0 : duration,
      easing: Easing.inOut(Easing.cubic),
    };
    // Colored reactions lead the calibrated eye pose slightly. This makes the
    // sequence read as: color appears → eyes settle → ambient motion starts.
    const surfaceTiming = {
      duration: reduceMotion ? 0 : Math.max(duration - AVATAR_SURFACE_LEAD_MS, 0),
      easing: Easing.inOut(Easing.cubic),
    };
    const motionResetDuration = reduceMotion ? 0 : AVATAR_MOTION_RESET_MS;
    const motionDelay = reduceMotion
      ? 0
      : Math.max(duration - motionResetDuration, 0) + AVATAR_MOTION_SETTLE_MS;
    const nextEyeMotion = motionCode(target.eyeMotion);
    const nextBodyMotion = motionCode(target.bodyMotion);

    headXSV.value = withTiming(target.headX, timing);
    headYSV.value = withTiming(target.headY, timing);
    headZSV.value = withTiming(target.headZ, timing);
    widthLSV.value = withTiming(target.widthLeft, timing);
    widthRSV.value = withTiming(target.widthRight, timing);
    heightLSV.value = withTiming(target.heightLeft, timing);
    heightRSV.value = withTiming(target.heightRight, timing);
    spacingSV.value = withTiming(target.spacing, timing);
    positionXLSV.value = withTiming(target.positionXLeft, timing);
    positionXRSV.value = withTiming(target.positionXRight, timing);
    positionYLSV.value = withTiming(target.positionYLeft, timing);
    positionYRSV.value = withTiming(target.positionYRight, timing);
    leftAngleSV.value = withTiming(target.leftAngle, timing);
    rightAngleSV.value = withTiming(target.rightAngle, timing);
    perspectiveSV.value = withTiming(target.perspective, timing);
    eyeMotionSV.value =
      nextEyeMotion === 0
        ? withTiming(0, { duration: motionResetDuration })
        : withSequence(
            withTiming(0, { duration: motionResetDuration }),
            withDelay(motionDelay, withTiming(nextEyeMotion, { duration: 0 })),
          );
    bodyMotionSV.value =
      nextBodyMotion === 0
        ? withTiming(0, { duration: motionResetDuration })
        : withSequence(
            withTiming(0, { duration: motionResetDuration }),
            withDelay(motionDelay, withTiming(nextBodyMotion, { duration: 0 })),
          );
    motionStrengthSV.value =
      nextEyeMotion === 0 && nextBodyMotion === 0
        ? withTiming(0, { duration: motionResetDuration })
        : withSequence(
            withTiming(0, { duration: motionResetDuration }),
            withDelay(
              motionDelay,
              withTiming(reduceMotion ? 0 : Math.max(0.35, reactionIntensity || 1), {
                duration: reduceMotion ? 0 : AVATAR_MOTION_RAMP_MS,
                easing: Easing.out(Easing.cubic),
              }),
            ),
          );
    faceColorSV.value = withTiming(targetSurface.face, surfaceTiming);
    shadowColorSV.value = withTiming(targetSurface.shadow, surfaceTiming);
    highlightColorSV.value = withTiming(targetSurface.highlight, surfaceTiming);
    inkColorSV.value = withTiming(targetSurface.ink, surfaceTiming);
  }, [
    bodyMotionSV,
    current,
    eyeMotionSV,
    faceColorSV,
    headXSV,
    headYSV,
    headZSV,
    heightLSV,
    heightRSV,
    highlightColorSV,
    inkColorSV,
    leftAngleSV,
    perspectiveSV,
    positionXLSV,
    positionXRSV,
    positionYLSV,
    positionYRSV,
    reduceMotion,
    rightAngleSV,
    shadowColorSV,
    spacingSV,
    reactionIntensity,
    target,
    targetSurface,
    widthLSV,
    widthRSV,
    motionStrengthSV,
  ]);

  useFrameCallback(frame => {
    'worklet';

    const elapsedMs = frame.timestamp;
    const time = elapsedMs / 1000;
    // The assistant's own voice drives the per-frame liveliness. Computed from
    // the PCM the client already has, so this costs no network and no model:
    // the reaction picks the pose, the envelope makes it breathe.
    const voice = reduceMotion ? 0 : voiceLevel.value;
    const strength =
      reduceMotion
        ? 0
        : motionStrengthSV.value * (1 - VOICE_ENVELOPE_MOTION_GAIN + VOICE_ENVELOPE_MOTION_GAIN * (1 + voice) / 2);
    // Keep the slow body bob on the same ramp as shake/drift. Otherwise it
    // can jump in one frame when a new motion code is enabled.
    const bobStrength = strength;
    const bodyMotion = bodyMotionSV.value;
    const eyeMotion = eyeMotionSV.value;
    const seed = headXSV.value * 0.71 + headYSV.value * 1.13 + headZSV.value * 1.37;
    const smoothstep = (value: number) => value * value * (3 - 2 * value);
    const hash = (value: number) => {
      const raw = Math.sin(value * 127.1 + 311.7) * 43758.5453;
      return (raw - Math.floor(raw)) * 2 - 1;
    };
    const noise = (axis: number, interval: number) => {
      const progress = elapsedMs / interval;
      const step = Math.floor(progress);
      const blend = smoothstep(progress - step);
      const previous = hash(step * 3 + axis + seed);
      const next = hash((step + 1) * 3 + axis + seed);
      return previous + (next - previous) * blend;
    };
    const saccade = (axis: number) => {
      if (elapsedMs <= 0) return 0;
      const interval = 1100;
      const duration = 140;
      const step = Math.floor(elapsedMs / interval);
      const progress = (elapsedMs - step * interval) / duration;
      const blend = smoothstep(Math.min(progress, 1));
      const previous = step === 0 ? 0 : hash((step - 1) * 2 + axis + 17.29);
      const next = hash(step * 2 + axis + 17.29);
      return previous + (next - previous) * blend;
    };

    if (bodyMotion === 1) {
      bodyOffsetXSV.value = noise(3, 2900) * 1.45 * strength;
      bodyOffsetYSV.value = noise(4, 3700) * 1.1 * strength;
      ambientRotationSV.value = noise(2, 4100) * 0.45 * strength;
    } else if (bodyMotion === 2) {
      bodyOffsetXSV.value = (Math.sin(time * 31) + Math.sin(time * 53) * 0.45) * 1.35 * strength;
      bodyOffsetYSV.value = (Math.sin(time * 37) + Math.sin(time * 61) * 0.4) * 1.1 * strength;
      ambientRotationSV.value = Math.sin(time * 43) * 0.7 * strength;
    } else {
      bodyOffsetXSV.value = 0;
      bodyOffsetYSV.value = 0;
      ambientRotationSV.value = 0;
    }

    if (eyeMotion === 1) {
      eyeOffsetXSV.value = saccade(0) * 1.5 * strength;
      eyeOffsetYSV.value = saccade(1) * 0.9 * strength;
    } else if (eyeMotion === 2) {
      eyeOffsetXSV.value = (Math.sin(time * 47) + Math.sin(time * 71) * 0.45) * 1.2 * strength;
      eyeOffsetYSV.value = (Math.sin(time * 59) + Math.sin(time * 83) * 0.4) * 0.8 * strength;
    } else {
      eyeOffsetXSV.value = 0;
      eyeOffsetYSV.value = 0;
    }

    // While speaking, the bob follows the real prosody instead of a fixed
    // sine, and loud syllables inject a little extra motion.
    const peak = voice * VOICE_ENVELOPE_PEAK_GAIN;
    bobOffsetSV.value =
      bobStrength *
      (current === 'speaking'
        ? Math.sin(time * 2.6) * 1.1 * (0.35 + voice) + peak * 1.4
        : bodyMotion === 1
          ? Math.sin(time * 0.8) * 0.3
          : 0);
    if (current === 'speaking' && eyeMotion !== 0) {
      eyeOffsetXSV.value += peak * 0.5;
      eyeOffsetYSV.value += peak * 0.3;
    }
  }, true);

  const bodyProps = useAnimatedProps(() => ({
    rotation: headZSV.value * 0.22 + ambientRotationSV.value,
    scale: 1 - Math.min(Math.abs(headYSV.value) * 0.0015, 0.045),
    originX: geometry.centerX,
    originY: geometry.centerY,
    x: bodyOffsetXSV.value,
    y: bodyOffsetYSV.value + headXSV.value * 0.035 + bobOffsetSV.value,
  }));

  const faceProps = useAnimatedProps(() => ({ fill: faceColorSV.value }));
  const shadowProps = useAnimatedProps(() => ({ fill: shadowColorSV.value }));
  const highlightProps = useAnimatedProps(() => ({ fill: highlightColorSV.value }));

  const eyeLProps = useAnimatedProps(() => {
    const poseX = headYSV.value * 0.12;
    const poseY = headXSV.value * 0.08;
    const centerX = geometry.centerX - spacingSV.value * 0.56 + positionXLSV.value * 0.55 + poseX + eyeOffsetXSV.value;
    const centerY = 92 + positionYLSV.value * 0.32 + poseY + eyeOffsetYSV.value;
    const width = Math.max(4.4, widthLSV.value * 0.62);
    const height = Math.max(3.2, heightLSV.value * 0.6);
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rx: Math.min(width / 2, height / 2),
      ry: Math.min(width / 2, height / 2),
      rotation: leftAngleSV.value + headZSV.value * 0.08,
      originX: centerX,
      originY: centerY,
      fill: inkColorSV.value,
    };
  });

  const eyeRProps = useAnimatedProps(() => {
    const poseX = headYSV.value * 0.12;
    const poseY = headXSV.value * 0.08;
    const centerX = geometry.centerX + spacingSV.value * 0.56 + positionXRSV.value * 0.55 + poseX + eyeOffsetXSV.value;
    const centerY = 92 + positionYRSV.value * 0.32 + poseY + eyeOffsetYSV.value;
    const width = Math.max(4.4, widthRSV.value * 0.62);
    const height = Math.max(3.2, heightRSV.value * 0.6);
    return {
      x: centerX - width / 2,
      y: centerY - height / 2,
      width,
      height,
      rx: Math.min(width / 2, height / 2),
      ry: Math.min(width / 2, height / 2),
      rotation: rightAngleSV.value + headZSV.value * 0.08,
      originX: centerX,
      originY: centerY,
      fill: inkColorSV.value,
    };
  });

  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${AVATAR_VIEWBOX.width} ${AVATAR_VIEWBOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image">
      <AnimatedG animatedProps={bodyProps}>
        <AnimatedPath animatedProps={shadowProps} d={geometry.blobShadowPath} opacity={0.82} />
        <AnimatedPath
          animatedProps={faceProps}
          d={geometry.blobPath}
          stroke={palette.outline}
          strokeWidth={1.4}
        />
        <AnimatedPath animatedProps={highlightProps} d={geometry.blobHighlightPath} opacity={0.5} />
        <AnimatedRect
          animatedProps={eyeLProps}
          x={geometry.eyeL.cx - geometry.eyeL.rx}
          y={geometry.eyeL.cy - geometry.eyeL.ry}
          width={geometry.eyeL.rx * 2}
          height={geometry.eyeL.ry * 2}
          rx={geometry.eyeL.rx}
          ry={geometry.eyeL.rx}
        />
        <AnimatedRect
          animatedProps={eyeRProps}
          x={geometry.eyeR.cx - geometry.eyeR.rx}
          y={geometry.eyeR.cy - geometry.eyeR.ry}
          width={geometry.eyeR.rx * 2}
          height={geometry.eyeR.ry * 2}
          rx={geometry.eyeR.rx}
          ry={geometry.eyeR.rx}
        />
      </AnimatedG>
    </Svg>
  );
}

/* eslint-disable react-hooks/immutability */
import { useOrbStore } from '@/core/stores';
import {
  ORB_JUMP_DAMPING,
  ORB_JUMP_GAIN,
  ORB_JUMP_MAX,
  ORB_JUMP_ONSET,
  ORB_JUMP_STIFFNESS,
  ORB_PALETTE_ADJUST,
  ORB_SPEAKING_ATTACK_MS,
  ORB_STATE_PARAMS,
  ORB_STATE_TRANSITION_MS,
  colorTokens,
} from '@/shared/constants';
import { hexToHsv } from '@/shared/libs/color';
import { Canvas, Fill, Shader, useClock, type Uniforms } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useUniwind } from 'uniwind';
import { compileOrbShader, type OrbUniforms } from './orb-shader';

type OrbProps = {
  /** Live audio amplitude (0..1). Rises in this value trigger the micro-jump spring. */
  audioLevel?: SharedValue<number>;
  style?: StyleProp<ViewStyle>;
};

function Orb({ audioLevel, style }: OrbProps) {
  const { theme } = useUniwind();
  const state = useOrbStore((s) => s.state);

  const clock = useClock();
  const effect = useMemo(() => compileOrbShader(), []);
  const fallbackAudio = useSharedValue(0);
  const audio = audioLevel ?? fallbackAudio;

  const [size, setSize] = useState({ width: 0, height: 0 });

  const params = ORB_STATE_PARAMS[state];
  const intensity = useSharedValue(ORB_STATE_PARAMS.idle.intensity);
  const speed = useSharedValue(ORB_STATE_PARAMS.idle.speed);
  const wobble = useSharedValue(ORB_STATE_PARAMS.idle.wobble);
  const brightness = useSharedValue(ORB_STATE_PARAMS.idle.brightness);
  const pulse = useSharedValue(ORB_STATE_PARAMS.idle.pulse);
  const spread = useSharedValue(ORB_STATE_PARAMS.idle.spread);
  const tint = useSharedValue(ORB_STATE_PARAMS.idle.tint);
  const phase = useSharedValue(0);
  const jump = useSharedValue(0);
  const jumpVelocity = useSharedValue(0);
  const previousAudio = useSharedValue(0);

  const palette = colorTokens[theme];

  // The ring's palette is procedural but anchored on theme tokens: `accent`
  // gives the base hue/sat/val of the sweep and `error` the hue it bends to in
  // the error state.
  const uniformColors = useMemo(() => {
    const adjust = ORB_PALETTE_ADJUST[theme];
    const [hue, saturation, value] = hexToHsv(palette.accent);
    const [hueAlt] = hexToHsv(palette.error);

    return {
      u_hue: hue,
      u_sat: Math.min(saturation * adjust.saturation, 1),
      u_val: Math.min(value * adjust.value, 1),
      u_hueAlt: hueAlt,
    };
  }, [palette, theme]);

  const uniforms = useDerivedValue<OrbUniforms>(
    () => ({
      u_resolution: [size.width, size.height],
      u_time: clock.value,
      u_phase: phase.value,
      u_intensity: intensity.value,
      u_audio: audio.value,
      u_jump: jump.value,
      u_wobble: wobble.value,
      u_brightness: brightness.value,
      u_pulse: pulse.value,
      u_spread: spread.value,
      u_tint: tint.value,
      u_hue: uniformColors.u_hue,
      u_sat: uniformColors.u_sat,
      u_val: uniformColors.u_val,
      u_hueAlt: uniformColors.u_hueAlt,
    }),
    [size.width, size.height, uniformColors]
  );

  const canRender = size.width > 0 && size.height > 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);

  // Integrate the rotation phase on the UI thread: the ring physically
  // accelerates with the voice (no snapping between fixed speeds). The same
  // frame callback advances the micro-jump spring, so voice makes the orb bounce
  // while it keeps its shape — the deformation-driven version churned the
  // silhouette into a different blob on every syllable.
  useFrameCallback((frameInfo) => {
    const dt = Math.min(frameInfo.timeSincePreviousFrame ?? 16, 64) / 1000;
    phase.value += dt * speed.value * (1 + audio.value * 1.1);

    // Onset detection: only a *rise* in the envelope kicks the spring, so the
    // orb pops on attacks (syllables, beats) instead of tracking loudness.
    const onset = audio.value - previousAudio.value;
    previousAudio.value = audio.value;
    if (onset > ORB_JUMP_ONSET) {
      jumpVelocity.value += onset * ORB_JUMP_GAIN;
    }

    // Damped spring toward rest.
    jumpVelocity.value +=
      (-ORB_JUMP_STIFFNESS * jump.value - ORB_JUMP_DAMPING * jumpVelocity.value) * dt;
    jump.value = Math.min(Math.max(jump.value + jumpVelocity.value * dt, -ORB_JUMP_MAX), ORB_JUMP_MAX);
  });

  useEffect(() => {
    const config = {
      duration: state === 'speaking' ? ORB_SPEAKING_ATTACK_MS : ORB_STATE_TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    };
    intensity.value = withTiming(params.intensity, config);
    speed.value = withTiming(params.speed, config);
    wobble.value = withTiming(params.wobble, config);
    brightness.value = withTiming(params.brightness, config);
    pulse.value = withTiming(params.pulse, config);
    spread.value = withTiming(params.spread, config);
    tint.value = withTiming(params.tint, config);
  }, [params, intensity, speed, wobble, brightness, pulse, spread, tint, state]);

  return (
    <View style={style} onLayout={handleLayout}>
      {canRender && (
        <Canvas style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>
          <Fill>
            <Shader source={effect} uniforms={uniforms as unknown as Uniforms} />
          </Fill>
        </Canvas>
      )}
    </View>
  );
}

export default Orb;
export type { OrbProps };

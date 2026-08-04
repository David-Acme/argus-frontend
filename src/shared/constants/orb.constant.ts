import type { OrbState, OrbStateParams } from '@/core/types';

/**
 * Target shader parameters for each assistant state. The Orb component animates
 * toward these values with `withTiming`, so transitions are always smooth.
 * The live audio level is layered on top (wider ring, bigger wobble, faster
 * rotation, hot core line) — the ring never scales uniformly.
 *
 * `spread` is a turn fraction: 0.08 ≈ ±29° of hue around the accent token,
 * which keeps the sweep analogous (gold → amber → warm rose) instead of
 * rainbow.
 */
export const ORB_STATE_PARAMS: Record<OrbState, OrbStateParams> = {
  idle: { intensity: 0.3, wobble: 0.5, speed: 0.45, brightness: 0.95, pulse: 0, spread: 0.055, tint: 0 },
  listening: { intensity: 0.5, wobble: 0.8, speed: 0.85, brightness: 1.05, pulse: 0.2, spread: 0.075, tint: 0 },
  thinking: { intensity: 0.62, wobble: 0.7, speed: 2.2, brightness: 1.1, pulse: 1, spread: 0.09, tint: 0 },
  speaking: { intensity: 0.55, wobble: 1.15, speed: 1.25, brightness: 1.15, pulse: 0, spread: 0.085, tint: 0 },
  error: { intensity: 0.35, wobble: 0.3, speed: 0.3, brightness: 0.9, pulse: 0, spread: 0.02, tint: 1 },
};

/** Duration of the eased transition between assistant states. */
export const ORB_STATE_TRANSITION_MS = 900;

/** Faster attack when entering `speaking`, so the orb responds immediately to voice. */
export const ORB_SPEAKING_ATTACK_MS = 380;

/** Audio envelope: fast attack, slower release — natural, alive feel. */
export const ORB_AUDIO_ATTACK_MS = 50;
export const ORB_AUDIO_RELEASE_MS = 260;

/**
 * Voice "micro-jump" spring. The orb keeps its silhouette and its rotation; the
 * voice only makes it *bounce*. A rise in the audio envelope above
 * `ORB_JUMP_ONSET` injects velocity into a damped spring, which is fed to the
 * shader as `u_jump` (radius pop + brightness lift).
 *
 * Underdamped on purpose (ζ ≈ 0.47, ω ≈ 13.8 rad/s → ~0.45s period): the
 * overshoot is what makes it read as a jump instead of a fade.
 */
export const ORB_JUMP_ONSET = 0.012;
export const ORB_JUMP_GAIN = 9;
export const ORB_JUMP_STIFFNESS = 190;
export const ORB_JUMP_DAMPING = 13;
export const ORB_JUMP_MAX = 0.35;

/**
 * Saturation/value multipliers applied to the accent token per theme. Dark
 * needs a luminous ring; light needs a deeper one to read against the warm
 * `background` (#F4F1ED).
 */
export const ORB_PALETTE_ADJUST = {
  light: { saturation: 1.2, value: 1.02 },
  dark: { saturation: 1.45, value: 1 },
} as const;

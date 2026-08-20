import type { ReactionKind } from '@/core/types';

/**
 * Meaning → appearance. The backend only ever sends the reaction name, so
 * retargeting the avatar (new catalog, new theme, a different face entirely)
 * is a change to this table and nothing else.
 */
export const REACTION_SEMANTIC_KEY: Record<ReactionKind, string | null> = {
  idle: null, // keep the phase pose (idle / listening / thinking / speaking)
  warm: 'joyful-wide',
  thinking: 'upward-side-glance',
  uncertain: 'skeptical-right',
  attentive: 'small-attentive',
  recognizing: 'joyful-down-right',
  curious: 'curious-left',
  acknowledging: 'downward-gaze',
  confused: 'asymmetric-down-right',
  alarmed: 'surprised-left',
};

/**
 * How long a reaction holds before the avatar falls back to its phase pose.
 * A reaction is a punctuation mark, not a mood: holding it forever makes the
 * face look stuck.
 */
export const REACTION_HOLD_MS = 4200;

/** Envelope sampling: one RMS bucket per window, read by the render worklet. */
export const VOICE_ENVELOPE_WINDOW_MS = 32;
/** Fast attack, slow release — the same shape `use-mic-level` uses. */
export const VOICE_ENVELOPE_ATTACK_MS = 60;
export const VOICE_ENVELOPE_RELEASE_MS = 180;
/**
 * How much the speaking envelope modulates ambient motion, and how much it is
 * allowed to inject micro-movement on peaks. Drop `PEAK_GAIN` to 0 to go back
 * to intensity-only if the peaks read as a tic on device.
 */
export const VOICE_ENVELOPE_MOTION_GAIN = 0.85;
export const VOICE_ENVELOPE_PEAK_GAIN = 0.6;

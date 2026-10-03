import type { ReactionKind } from '@/core/types';

export const REACTION_SEMANTIC_KEY: Record<ReactionKind, string | null> = {
  idle: null,
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

export const REACTION_HOLD_MS = 4200;

export const VOICE_ENVELOPE_WINDOW_MS = 32;
export const VOICE_ENVELOPE_ATTACK_MS = 60;
export const VOICE_ENVELOPE_RELEASE_MS = 180;
export const VOICE_ENVELOPE_MOTION_GAIN = 0.85;
export const VOICE_ENVELOPE_PEAK_GAIN = 0.6;

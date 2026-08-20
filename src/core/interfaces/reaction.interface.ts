import type { ReactionKind } from '@/core/types';

/** Payload of `voice:event`: what Argus is reacting with, and why. */
export interface IVoiceReactionPayload {
  reaction: ReactionKind;
  /** 0..1 — how strongly to play the expression. */
  intensity: number;
  /** Signal that produced it (`recall_hit`, `stt_failed`, …). Debug only. */
  because?: string;
}

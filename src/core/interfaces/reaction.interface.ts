import type { ReactionKind } from '@/core/types';

export interface IVoiceReactionPayload {
  reaction: ReactionKind;
  intensity: number;
  because?: string;
}

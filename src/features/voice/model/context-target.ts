export type ContextTarget = 'voice' | 'chat';

export type ContextTargetInput = {
  voiceActive: boolean;
  chatOpen: boolean;
};

export function contextTarget({ voiceActive, chatOpen }: ContextTargetInput): ContextTarget | null {
  if (voiceActive) return 'voice';
  return chatOpen ? 'chat' : null;
}

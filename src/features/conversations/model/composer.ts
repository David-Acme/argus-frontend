export type ComposerMode = 'relay-by-voice' | 'argus-by-voice' | 'no-voice';

export type ComposerInput = {
  argus: boolean;
  voiceAllowed: boolean;
  voiceSupported: boolean;
};

export function composerMode({ argus, voiceAllowed, voiceSupported }: ComposerInput): ComposerMode {
  if (!voiceAllowed || !voiceSupported) return 'no-voice';
  return argus ? 'argus-by-voice' : 'relay-by-voice';
}

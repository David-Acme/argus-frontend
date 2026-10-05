import type { BiometricErasure, VoiceprintDirectory } from '@/core/types';

export type ErasureSummary =
  | { kind: 'nothing' }
  | { kind: 'counts'; faces: number; portraits: number; samples: number };

export function withoutVoice(directory: VoiceprintDirectory | null, userId: number): VoiceprintDirectory | null {
  if (!directory) return directory;
  return { ...directory, recognized: directory.recognized.filter((voice) => voice.userId !== userId) };
}

export function erasureSummary(erasure: BiometricErasure): ErasureSummary {
  const nothing =
    erasure.faces === 0 && erasure.portraits === 0 && !erasure.voiceProfile && erasure.voiceSamples === 0;
  if (nothing) return { kind: 'nothing' };
  return { kind: 'counts', faces: erasure.faces, portraits: erasure.portraits, samples: erasure.voiceSamples };
}

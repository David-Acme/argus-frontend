import type { IApiError } from '@/core/interfaces';
import type { TranslationKey, VoiceSampleProblem } from '@/core/types';

export type VoiceprintProblem =
  | 'too-short'
  | 'too-noisy'
  | 'clipped'
  | 'invalid'
  | 'unavailable'
  | 'inconsistent'
  | 'taken'
  | 'already-enrolled'
  | 'expired'
  | 'permission'
  | 'microphone'
  | 'generic';

export const VOICEPRINT_PROBLEM_KEYS: Readonly<Record<VoiceprintProblem, TranslationKey>> = {
  'too-short': 'screens.voiceprint.problems.too-short',
  'too-noisy': 'screens.voiceprint.problems.too-noisy',
  clipped: 'screens.voiceprint.problems.clipped',
  invalid: 'screens.voiceprint.problems.invalid',
  unavailable: 'screens.voiceprint.problems.unavailable',
  inconsistent: 'screens.voiceprint.problems.inconsistent',
  taken: 'screens.voiceprint.problems.taken',
  'already-enrolled': 'screens.voiceprint.problems.already-enrolled',
  expired: 'screens.voiceprint.problems.expired',
  permission: 'screens.voiceprint.problems.permission',
  microphone: 'screens.voiceprint.problems.microphone',
  generic: 'screens.voiceprint.problems.generic',
};

const SAMPLE_PROBLEMS: Readonly<Record<VoiceSampleProblem, VoiceprintProblem>> = {
  too_short: 'too-short',
  too_noisy: 'too-noisy',
  clipped: 'clipped',
  invalid: 'invalid',
  unavailable: 'unavailable',
};

const REFUSALS: readonly (readonly [string, VoiceprintProblem])[] = [
  ['The voice sample has too little speech', 'too-short'],
  ['The voice sample is too noisy', 'too-noisy'],
  ['The voice sample is distorted', 'clipped'],
  ['The voice sample could not be read', 'invalid'],
  ['Voice recognition is not available', 'unavailable'],
  ['The voice samples do not belong to one speaker', 'inconsistent'],
  ['This voice is already linked to another person', 'taken'],
  ['A voiceprint is already enrolled', 'already-enrolled'],
  ['The voice enrollment challenge is invalid or expired', 'expired'],
  ['The number of voice samples is not the required one', 'expired'],
];

export function sampleProblem(problem: VoiceSampleProblem | null): VoiceprintProblem {
  return problem ? SAMPLE_PROBLEMS[problem] : 'invalid';
}

export function problemOfError(error: IApiError | null | undefined): VoiceprintProblem {
  if (!error) return 'generic';
  const known = REFUSALS.find(([message]) => message === error.message);
  if (known) return known[1];
  return error.code === 'SERVICE_UNAVAILABLE' ? 'unavailable' : 'generic';
}

export function problemOfRecorder(error: unknown): VoiceprintProblem {
  const message = error instanceof Error ? error.message : String(error);
  return message.startsWith('MIC_PERMISSION_DENIED') ? 'permission' : 'microphone';
}

export function restartsEnrollment(problem: VoiceprintProblem): boolean {
  return problem === 'expired' || problem === 'taken' || problem === 'already-enrolled';
}

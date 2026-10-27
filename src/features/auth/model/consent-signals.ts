import type { PrivacySignal } from '@/core/types';
import type { OnboardingFlowId } from '@/features/auth/model/onboarding-flow';

const EVERY_SIGNAL: readonly PrivacySignal[] = [
  'presence',
  'faceCameras',
  'voiceLearning',
  'cameraAudio',
];

export const consentSignalsOf = (
  flow: OnboardingFlowId,
  core: readonly PrivacySignal[]
): readonly PrivacySignal[] => (flow === 'owner' ? core : EVERY_SIGNAL);

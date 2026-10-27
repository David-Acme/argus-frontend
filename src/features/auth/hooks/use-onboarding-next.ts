import { useCallback } from 'react';
import { IS_NATIVE } from '@/shared/constants';
import { nextHref, progressOf } from '@/features/auth/model/onboarding-flow';
import type {
  OnboardingFlowId,
  OnboardingHref,
  OnboardingProgress,
  OnboardingStepId,
} from '@/features/auth/model/onboarding-flow';

export type OnboardingNext = {
  next: (
    flow: OnboardingFlowId,
    step: OnboardingStepId,
    moduleSignals?: boolean | null
  ) => OnboardingHref | '/';
  progress: (
    flow: OnboardingFlowId,
    step: OnboardingStepId,
    moduleSignals: boolean | null
  ) => OnboardingProgress | null;
};

export function useOnboardingNext(): OnboardingNext {
  const next = useCallback(
    (flow: OnboardingFlowId, step: OnboardingStepId, moduleSignals?: boolean | null) =>
      nextHref(flow, step, { native: IS_NATIVE, moduleSignals }) ?? '/',
    []
  );
  const progress = useCallback(
    (flow: OnboardingFlowId, step: OnboardingStepId, moduleSignals: boolean | null) =>
      progressOf(flow, step, { native: IS_NATIVE, moduleSignals }),
    []
  );
  return { next, progress };
}

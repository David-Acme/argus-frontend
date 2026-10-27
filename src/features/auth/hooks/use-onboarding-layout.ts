import { useWindowHeight, useWindowWidth } from '@/shared/theme';
import { onboardingLayoutOf } from '@/features/auth/model/onboarding-layout';
import type { OnboardingLayout } from '@/features/auth/model/onboarding-layout';

export function useOnboardingLayout(): OnboardingLayout {
  return onboardingLayoutOf({ width: useWindowWidth(), height: useWindowHeight() });
}

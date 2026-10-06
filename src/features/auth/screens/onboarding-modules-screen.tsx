import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAuthStore } from '@/core/stores';
import { IS_NATIVE } from '@/shared/constants';
import { ModulesStepScreen } from '@/features/modules';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { nextHref } from '@/features/auth/model/onboarding-flow';

export default function OnboardingModulesScreen() {
  const router = useRouter();
  const isOwner = useAuthStore((state) => state.status === 'signed-in' && state.user?.role === 'owner');
  const next = nextHref('owner', 'modules', { native: IS_NATIVE });

  const handleNext = useCallback(() => {
    if (next) router.replace(next);
    else router.replace('/');
  }, [next, router]);

  if (!isOwner) return <Redirect href="/" />;
  return <ModulesStepScreen header={<OnboardingSteps flow="owner" step="modules" />} onNext={handleNext} />;
}

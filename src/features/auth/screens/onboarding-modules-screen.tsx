import { Redirect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { moduleEngine } from '@/core/services/modules';
import { signalsToAsk } from '@/features/privacy';
import { CAPABILITY, IS_NATIVE } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { ModulesStepScreen } from '@/features/modules';
import { OnboardingSteps } from '@/features/auth/components/onboarding-steps';
import { nextHref } from '@/features/auth/model/onboarding-flow';

export default function OnboardingModulesScreen() {
  const router = useRouter();
  const { has } = useCapabilities();
  const isOwner = has(CAPABILITY.modulesManage);
  const handleNext = useCallback(() => {
    const moduleSignals = signalsToAsk(moduleEngine.current()).length > 0;
    const next = nextHref('owner', 'modules', { native: IS_NATIVE, moduleSignals });
    if (next) router.replace(next);
    else router.replace('/');
  }, [router]);

  if (!isOwner) return <Redirect href="/" />;
  return <ModulesStepScreen header={<OnboardingSteps flow="owner" step="modules" />} onNext={handleNext} />;
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import type { PrivacyChoices } from '@/core/types';
import { consentDraft, coreSignals, NO_CHOICES, onlyCoreChoices } from '@/features/privacy';
import { PrivacyStep } from '@/features/auth/components/privacy-step';
import { consentSignalsOf } from '@/features/auth/model/consent-signals';
import { clearInviteToken } from '@/features/auth/model/invite-slot';
import { flowOf } from '@/features/auth/model/onboarding-flow';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

export default function PrivacyScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const flow = flowOf({ mode });
  const { next } = useOnboardingNext();
  const [choices, setChoices] = useState<PrivacyChoices>(() => consentDraft.peek() ?? NO_CHOICES);
  const signals = consentSignalsOf(flow, coreSignals());

  const accept = () => {
    consentDraft.set(flow === 'owner' ? onlyCoreChoices(choices) : choices);
    router.replace(next(flow, 'privacy'));
  };

  const leave = () => {
    consentDraft.take();
    if (flow === 'invited') clearInviteToken();
    router.replace('/welcome');
  };

  return (
    <PrivacyStep
      place={{ flow, step: 'privacy' }}
      signals={signals}
      choices={choices}
      failed={false}
      onChange={(signal, value) => setChoices((previous) => ({ ...previous, [signal]: value }))}
      onAccept={accept}
      onBack={leave}
    />
  );
}

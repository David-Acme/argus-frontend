import { Redirect, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import type { PrivacyChoices } from '@/core/types';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useModuleCatalog } from '@/features/modules';
import {
  answeredChoices,
  decisionOf,
  NO_CHOICES,
  privacyService,
  signalsToAsk,
  usePrivacy,
} from '@/features/privacy';
import { PrivacyStep } from '@/features/auth/components/privacy-step';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

export default function OnboardingModulePrivacyScreen() {
  const router = useRouter();
  const { has } = useCapabilities();
  const { next } = useOnboardingNext();
  const catalog = useModuleCatalog();
  const { me } = usePrivacy();
  const [answers, setAnswers] = useState<PrivacyChoices | null>(null);
  const [failed, setFailed] = useState(false);
  const asked = useMemo(() => signalsToAsk(catalog), [catalog]);
  const choices = answers ?? me?.choices ?? NO_CHOICES;
  const after = next('owner', 'module-privacy', true);

  const save = async () => {
    if (!me) return;
    const saved = await privacyService.decide(
      decisionOf(answeredChoices(me.choices, asked, choices))
    );
    setFailed(!saved.ok);
    if (saved.ok) router.replace(after);
  };

  if (!has(CAPABILITY.modulesManage)) return <Redirect href="/" />;
  if (catalog !== null && asked.length === 0)
    return <Redirect href={next('owner', 'modules', false)} />;

  return (
    <PrivacyStep
      place={{ flow: 'owner', step: 'module-privacy' }}
      signals={asked}
      choices={choices}
      failed={failed}
      disabled={!me}
      onChange={(signal, value) => setAnswers({ ...choices, [signal]: value })}
      onAccept={save}
    />
  );
}

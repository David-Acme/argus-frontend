import { Redirect, useRouter } from 'expo-router';
import { View } from 'react-native';
import { moduleEngine } from '@/core/services/modules';
import { CAPABILITY } from '@/shared/constants';
import { useCapabilities } from '@/shared/hooks/use-capabilities';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { Notice } from '@/shared/ui/notice';
import { SkeletonRow } from '@/shared/ui/resource-view';
import { Section } from '@/shared/ui/section';
import { useModuleStep } from '@/features/modules';
import { signalsToAsk } from '@/features/privacy';
import { ModuleChoiceCard } from '@/features/auth/components/module-choice-card';
import { OnboardingFrame } from '@/features/auth/components/onboarding-frame';
import { OnboardingHeading } from '@/features/auth/components/onboarding-heading';
import { OnboardingTop } from '@/features/auth/components/onboarding-top';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';

type ModuleCardsProps = { step: ReturnType<typeof useModuleStep> };

function ModuleCards({ step }: ModuleCardsProps) {
  const { t } = useTranslation();
  if (step.status === 'loading')
    return (
      <Section>
        <SkeletonRow />
        <SkeletonRow />
      </Section>
    );
  if (step.status === 'waiting')
    return (
      <Notice
        icon="wifioff"
        tone="attention"
        title={t('screens.modules.waiting-title')}
        body={t('screens.modules.waiting-hint')}
      />
    );
  return (
    <View className="gap-3">
      {step.cards.map((card) => (
        <ModuleChoiceCard key={card.id} card={card} onToggle={step.toggle} />
      ))}
    </View>
  );
}

export default function OnboardingModulesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { has } = useCapabilities();
  const { next } = useOnboardingNext();
  const step = useModuleStep(() => {
    const moduleSignals = signalsToAsk(moduleEngine.current()).length > 0;
    router.replace(next('owner', 'modules', moduleSignals));
  });

  if (!has(CAPABILITY.modulesManage)) return <Redirect href="/" />;
  return (
    <OnboardingFrame
      top={<OnboardingTop place={{ flow: 'owner', step: 'modules' }} />}
      footer={
        <Button
          variant="primary"
          block
          label={t('screens.welcome.permissions.continue')}
          onPress={step.start}
          disabled={!step.fits || step.status === 'loading'}
        />
      }>
      <OnboardingHeading
        title={t('screens.modules.step-title')}
        lead={t('screens.modules.step-subtitle')}
      />
      <View className="mt-6">
        <ModuleCards step={step} />
      </View>
      <View className="min-h-6 flex-1" />
    </OnboardingFrame>
  );
}

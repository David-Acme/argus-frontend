import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Button } from '@/shared/ui/button';
import { useModuleCatalog } from '@/features/modules';
import { signalsToAsk } from '@/features/privacy';
import { useOnboardingNext } from '@/features/auth/hooks/use-onboarding-next';
import { signalsKnownAt } from '@/features/auth/model/onboarding-flow';
import type {
  OnboardingFlowId,
  OnboardingProgress,
  OnboardingStepId,
} from '@/features/auth/model/onboarding-flow';

export type OnboardingPlace = { flow: OnboardingFlowId; step: OnboardingStepId };

export type OnboardingTopProps = {
  onBack?: () => void;
  place?: OnboardingPlace;
  trailing?: ReactNode;
};

type StepDotsProps = { progress: OnboardingProgress };

function StepDots({ progress }: StepDotsProps) {
  const { t } = useTranslation();
  const { current, total, label } = progress;
  const spoken = `${t('common.step', { current: String(current), total: String(total) })}. ${t(label)}`;
  return (
    <View
      role="progressbar"
      aria-label={spoken}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      className="flex-row gap-2">
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          className={clsx(
            'w-step-dot h-step-dot-height rounded-full',
            index < current ? 'bg-text' : 'bg-fill-press'
          )}
        />
      ))}
    </View>
  );
}

function useProgress(place: OnboardingPlace | undefined): OnboardingProgress | null {
  const catalog = useModuleCatalog();
  const { progress } = useOnboardingNext();
  if (!place) return null;
  const moduleSignals = signalsKnownAt(place.flow, place.step)
    ? signalsToAsk(catalog).length > 0
    : null;
  return progress(place.flow, place.step, moduleSignals);
}

export function OnboardingTop({ onBack, place, trailing }: OnboardingTopProps) {
  const { t } = useTranslation();
  const progress = useProgress(place);
  if (!onBack && !trailing && !progress) return null;
  return (
    <View className="min-h-target-min mb-2 flex-row items-center justify-between">
      {onBack ? (
        <Button iconOnly filled icon="back" label={t('common.back')} onPress={onBack} />
      ) : (
        <View className="size-target-min" />
      )}
      {progress ? <StepDots progress={progress} /> : null}
      {trailing ?? <View className="size-target-min" />}
    </View>
  );
}

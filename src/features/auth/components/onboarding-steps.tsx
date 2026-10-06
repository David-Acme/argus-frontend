import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { IS_NATIVE } from '@/shared/constants';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';
import { useModuleCatalog } from '@/features/modules';
import { signalsToAsk } from '@/features/privacy';
import {
  progressOf,
  signalsKnownAt,
  type OnboardingFlowId,
  type OnboardingStepId,
} from '@/features/auth/model/onboarding-flow';

type OnboardingStepsProps = {
  flow: OnboardingFlowId;
  step: OnboardingStepId;
  className?: string;
};

export function OnboardingSteps({ flow, step, className }: OnboardingStepsProps) {
  const { t } = useTranslation();
  const catalog = useModuleCatalog();
  const moduleSignals = signalsKnownAt(flow, step) ? signalsToAsk(catalog).length > 0 : null;
  const progress = progressOf(flow, step, { native: IS_NATIVE, moduleSignals });
  if (!progress) return null;
  const { current, total, steps } = progress;
  const position = t('common.step', { current: String(current), total: String(total) });
  const name = t(steps[current - 1]?.label ?? 'screens.welcome.steps.pair');
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`${position}. ${name}`}
      accessibilityValue={{ min: 1, max: total, now: current }}
      className={cn('flex-row items-center gap-3', className)}>
      <View className="flex-row items-center gap-1.5">
        {steps.map((item, index) => (
          <View
            key={item.id}
            className={cn(
              'h-1.5 rounded-full',
              index + 1 === current ? 'bg-accent w-9' : 'w-5',
              index + 1 < current ? 'bg-interactive' : index + 1 > current ? 'bg-border' : null
            )}
          />
        ))}
      </View>
      <Text variant="micro" numberOfLines={1} className="shrink">
        {`${position} · ${name}`}
      </Text>
    </View>
  );
}

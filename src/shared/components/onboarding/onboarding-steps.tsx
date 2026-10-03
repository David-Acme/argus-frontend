import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type OnboardingStepsProps = {
  current: number;
  total: number;
  className?: string;
};

export function OnboardingSteps({ current, total, className }: OnboardingStepsProps) {
  const { t } = useTranslation();
  const label = t('common.step', { current: String(current), total: String(total) });
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: total, now: current }}
      className={cn('flex-row items-center gap-3', className)}>
      <View className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            className={cn(
              'h-1.5 w-7 rounded-full',
              index < current ? 'bg-interactive' : 'bg-border'
            )}
          />
        ))}
      </View>
      <Text variant="micro">{label}</Text>
    </View>
  );
}

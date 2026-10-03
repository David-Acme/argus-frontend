import { View } from 'react-native';
import type { GuardDanger } from '@/core/types';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

const TONE: Record<GuardDanger, { dot: string; text: string }> = {
  none: { dot: 'bg-muted-foreground', text: 'text-foreground-secondary' },
  low: { dot: 'bg-muted-foreground', text: 'text-foreground-secondary' },
  medium: { dot: 'bg-warning', text: 'text-warning-strong' },
  high: { dot: 'bg-error', text: 'text-error-strong' },
  critical: { dot: 'bg-error', text: 'text-error-strong' },
};

export function DangerBadge({ danger }: { danger: GuardDanger }) {
  const { t } = useTranslation();
  const tone = TONE[danger] ?? TONE.none;
  return (
    <View className="flex-row items-center gap-1.5">
      <View className={cn('size-2 rounded-full', tone.dot)} />
      <Text variant="micro" className={cn('font-semibold', tone.text)}>
        {t(`screens.security.danger.${danger}`)}
      </Text>
    </View>
  );
}

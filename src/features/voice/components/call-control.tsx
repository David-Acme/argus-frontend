import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type CallControlProps = {
  icon: IconName;
  label: string;
  tone?: 'neutral' | 'active' | 'danger';
  onPress: () => void;
};

const TONES = {
  neutral: { circle: 'bg-surface-secondary', icon: 'text-foreground' },
  active: { circle: 'bg-interactive', icon: 'text-foreground-on-interactive' },
  danger: { circle: 'bg-error', icon: 'text-foreground-on-error' },
} as const;

export function CallControl({ icon, label, tone = 'neutral', onPress }: CallControlProps) {
  const colors = TONES[tone];
  return (
    <View className="w-20 items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        className={cn('size-16 items-center justify-center rounded-full active:opacity-75', colors.circle)}>
        <Icon name={icon} className={cn('size-7', colors.icon)} />
      </Pressable>
      <Text variant="micro" className="text-center" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

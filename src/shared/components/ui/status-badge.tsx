import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type StatusBadgeProps = {
  label: string;
  icon?: IconName;
  iconClassName?: string;
  dotClassName?: string;
  surface?: 'muted' | 'card';
  className?: string;
  textClassName?: string;
};

export function StatusBadge({
  label,
  icon,
  iconClassName,
  dotClassName,
  surface = 'muted',
  className,
  textClassName,
}: StatusBadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1',
        surface === 'card' ? 'bg-card' : 'bg-surface-secondary',
        className
      )}>
      {dotClassName ? <View className={cn('size-2 rounded-full', dotClassName)} /> : null}
      {icon ? <Icon name={icon} className={cn('text-foreground-secondary size-3.5', iconClassName)} /> : null}
      <Text variant="micro" numberOfLines={1} className={cn('text-foreground-secondary', textClassName)}>
        {label}
      </Text>
    </View>
  );
}

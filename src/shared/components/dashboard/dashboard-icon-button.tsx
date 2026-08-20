import { Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';

type DashboardIconButtonProps = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** Shows an unread dot when greater than zero. */
  badge?: number;
};

export function DashboardIconButton({
  icon,
  label,
  onPress,
  badge,
}: DashboardIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className="bg-card active:bg-surface-secondary relative size-11 items-center justify-center rounded-full shadow-sm shadow-black/[0.08]"
      onPress={onPress}>
      <Icon name={icon} className="text-foreground size-5" />
      {badge != null && badge > 0 ? (
        <View className="bg-error border-card absolute right-0.5 top-0.5 size-2.5 rounded-full border-2" />
      ) : null}
    </Pressable>
  );
}

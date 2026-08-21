import { Pressable, View, type PressableProps } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { cn } from '@/shared/libs/utils';

type DashboardIconButtonProps = Omit<PressableProps, 'children' | 'className'> & {
  icon: IconName;
  label: string;
  /** Shows an unread dot when greater than zero. */
  badge?: number;
  className?: string;
};

/**
 * Round header action. The remaining Pressable props are forwarded so it can be
 * used as an `asChild` trigger for a popover or a sheet.
 */
export function DashboardIconButton({
  icon,
  label,
  badge,
  className,
  ...props
}: DashboardIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        'bg-card active:bg-surface-secondary relative size-11 items-center justify-center rounded-full shadow-sm shadow-black/[0.08]',
        className
      )}
      {...props}>
      <Icon name={icon} className="text-foreground size-5" />
      {badge != null && badge > 0 ? (
        <View className="bg-error border-card absolute right-0.5 top-0.5 size-2.5 rounded-full border-2" />
      ) : null}
    </Pressable>
  );
}

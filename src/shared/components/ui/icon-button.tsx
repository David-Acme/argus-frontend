import { Pressable, View, type PressableProps } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { cn } from '@/shared/libs/utils';

type IconButtonProps = Omit<PressableProps, 'children' | 'className'> & {
  icon: IconName;
  label: string;
  badge?: number;
  className?: string;
};

export function IconButton({
  icon,
  label,
  badge,
  className,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={badge != null && badge > 0 ? { text: String(badge) } : undefined}
      className={cn(
        'bg-card active:bg-surface-secondary web:hover:bg-surface-secondary relative size-11 items-center justify-center rounded-full shadow-sm shadow-black/[0.08]',
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

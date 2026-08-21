import { type ReactNode } from 'react';
import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { EMPTY_STATE_MAX_WIDTH } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Takes the remaining height; off when it sits inside a section. */
  fill?: boolean;
  className?: string;
};

/**
 * One calm panel instead of a wall of placeholders: it takes the space a list
 * would have had, stays centred, and caps its width so it reads the same on a
 * phone, a tablet and a desktop window.
 */
export function EmptyState({ icon, title, hint, action, fill = true, className }: EmptyStateProps) {
  return (
    <View className={cn('w-full', fill && 'flex-1')}>
      <View
        className={cn(
          'border-border-subtle bg-card/50 w-full flex-1 items-center justify-center gap-4 self-center rounded-3xl border border-dashed px-6',
          fill ? 'py-10' : 'py-8',
          className
        )}
        style={{ maxWidth: EMPTY_STATE_MAX_WIDTH }}>
        <View className="bg-surface-secondary size-14 items-center justify-center rounded-2xl">
          <Icon name={icon} className="text-foreground-secondary size-6" />
        </View>
        <View className="items-center gap-1.5">
          <Text className="text-center text-[17px] font-semibold">{title}</Text>
          {hint ? (
            <Text className="text-foreground-secondary text-center text-[13px] leading-5">
              {hint}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

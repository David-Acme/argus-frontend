import { type ReactNode } from 'react';
import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { EMPTY_STATE_TEXT_MAX_WIDTH } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type EmptyStateVariant = 'page' | 'panel' | 'inline';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  hint?: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  fill?: boolean;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  hint,
  action,
  variant = 'page',
  fill = true,
  className,
}: EmptyStateProps) {
  if (variant !== 'page') {
    const panel = variant === 'panel';
    return (
      <View
        className={cn(
          'w-full items-center justify-center gap-2 self-stretch',
          panel ? 'flex-1 px-6 py-6' : 'py-6',
          className
        )}>
        <View
          className={cn(
            'bg-surface-secondary items-center justify-center rounded-full',
            panel ? 'mb-1 size-12' : 'size-10'
          )}>
          <Icon name={icon} className={cn('text-muted-foreground', panel ? 'size-6' : 'size-5')} />
        </View>
        <Text variant={panel ? 'label' : 'caption'} className="max-w-80 text-center">
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" className="max-w-80 text-center">
            {hint}
          </Text>
        ) : null}
        {action}
      </View>
    );
  }

  return (
    <View className={cn('w-full items-center justify-center self-stretch', fill && 'flex-1')}>
      <View
        className={cn(
          'border-border-subtle bg-card/50 w-full items-center justify-center gap-4 self-stretch rounded-3xl border border-dashed px-6',
          fill ? 'py-10' : 'py-8',
          className
        )}>
        <View className="bg-surface-secondary size-14 items-center justify-center rounded-2xl">
          <Icon name={icon} className="text-foreground-secondary size-6" />
        </View>
        <View className="w-full items-center gap-1.5" style={{ maxWidth: EMPTY_STATE_TEXT_MAX_WIDTH }}>
          <Text variant="subhead" className="text-center">
            {title}
          </Text>
          {hint ? (
            <Text variant="caption" className="text-foreground-secondary text-center leading-5">
              {hint}
            </Text>
          ) : null}
        </View>
        {action}
      </View>
    </View>
  );
}

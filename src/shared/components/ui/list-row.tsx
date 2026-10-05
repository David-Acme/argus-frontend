import { type ReactNode } from 'react';
import { Platform, Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type ListRowProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  trailing?: ReactNode;
  footer?: ReactNode;
  footerLabel?: string;
  destructive?: boolean;
  chevron?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

const rowHover = Platform.select({ web: 'hover:bg-surface-secondary/60', default: '' });

export function ListRow({
  title,
  subtitle,
  icon,
  trailing,
  footer,
  footerLabel,
  destructive = false,
  chevron = false,
  disabled = false,
  onPress,
}: ListRowProps) {
  const content = (
    <>
      {icon ? (
        <View
          className={cn(
            'size-10 items-center justify-center rounded-full',
            destructive ? 'bg-error/10' : 'bg-surface-secondary',
          )}>
          <Icon
            name={icon}
            className={cn('size-5', destructive ? 'text-error-strong' : 'text-foreground-secondary')}
          />
        </View>
      ) : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          variant="body"
          numberOfLines={1}
          className={cn('font-medium', destructive && 'text-error-strong')}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {footer ? <View className="pt-1">{footer}</View> : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron-right" className="text-muted-foreground size-5" /> : null}
    </>
  );

  const className = cn('min-h-14 flex-row items-center gap-3 rounded-2xl px-3 py-2.5', disabled && 'opacity-50');

  if (!onPress) return <View className={className}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, subtitle, footerLabel].filter(Boolean).join('. ')}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(className, 'active:bg-surface-secondary', rowHover)}>
      {content}
    </Pressable>
  );
}

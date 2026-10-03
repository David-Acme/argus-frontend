import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import type { MenuOption } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type OptionRowProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  option: MenuOption;
  selected?: boolean;
  onSelect?: (value: string) => void;
  density?: 'comfortable' | 'compact';
};

export function OptionRow({
  option,
  selected,
  onSelect,
  density = 'comfortable',
  className,
  onPress,
  ...pressable
}: OptionRowProps) {
  return (
    <Pressable
      {...pressable}
      accessibilityRole="menuitem"
      accessibilityState={{ selected, disabled: option.disabled }}
      accessibilityLabel={option.label}
      disabled={option.disabled}
      className={cn(
        'flex-row items-center gap-3 rounded-[14px] px-3 active:opacity-70',
        density === 'compact' ? 'py-2' : 'py-3',
        selected && 'bg-surface-secondary',
        option.disabled && 'opacity-40',
        className
      )}
      onPress={onSelect ? () => onSelect(option.value) : onPress}>
      {option.icon ? (
        <Icon
          name={option.icon}
          className={cn('size-5', option.destructive ? 'text-error-strong' : 'text-foreground-secondary')}
        />
      ) : null}
      <View className="flex-1">
        <Text
          className={cn(
            'text-[15px] font-medium',
            option.destructive ? 'text-error-strong' : 'text-foreground'
          )}>
          {option.label}
        </Text>
        {option.description ? (
          <Text className="text-muted-foreground mt-0.5 text-[12px]">{option.description}</Text>
        ) : null}
      </View>
      {selected ? <Icon name="check" className="text-foreground size-4" /> : null}
    </Pressable>
  );
}

import { Pressable, View } from 'react-native';
import type { MenuOption } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type OptionRowProps = {
  option: MenuOption;
  selected?: boolean;
  /** Omit when a parent (e.g. a dropdown Item) owns the press. */
  onSelect?: (value: string) => void;
  /** Compact rows for dropdowns, tall touch targets for sheets. */
  density?: 'comfortable' | 'compact';
};

/** Shared row so a dropdown item and a sheet item never drift apart. */
export function OptionRow({ option, selected, onSelect, density = 'comfortable' }: OptionRowProps) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected, disabled: option.disabled }}
      accessibilityLabel={option.label}
      disabled={option.disabled}
      className={cn(
        'flex-row items-center gap-3 rounded-[14px] px-3 active:opacity-70',
        density === 'compact' ? 'py-2' : 'py-3',
        selected && 'bg-surface-secondary',
        option.disabled && 'opacity-40'
      )}
      onPress={onSelect ? () => onSelect(option.value) : undefined}>
      {option.icon ? (
        <Icon
          name={option.icon}
          className={cn('size-5', option.destructive ? 'text-error' : 'text-foreground-secondary')}
        />
      ) : null}
      <View className="flex-1">
        <Text
          className={cn(
            'text-[15px] font-medium',
            option.destructive ? 'text-error' : 'text-foreground'
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

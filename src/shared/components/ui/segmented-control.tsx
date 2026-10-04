import { Platform, Pressable, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SegmentedOption<TValue extends string> = {
  value: TValue;
  label: string;
  icon?: IconName;
};

type SegmentedControlProps<TValue extends string> = {
  options: readonly SegmentedOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  accessibilityLabel: string;
};

const segmentHover = Platform.select({ web: 'hover:bg-card/60', default: '' });

export function SegmentedControl<TValue extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<TValue>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className="bg-surface-secondary flex-row gap-1 rounded-2xl p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            className={cn(
              'min-h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-lg px-3 active:opacity-80',
              selected ? 'bg-interactive shadow-sm shadow-black/10' : segmentHover,
            )}>
            {option.icon ? (
              <Icon
                name={option.icon}
                className={cn('size-4', selected ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
              />
            ) : null}
            <Text
              variant="label"
              numberOfLines={1}
              className={selected ? 'text-foreground-on-interactive' : 'text-foreground-secondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

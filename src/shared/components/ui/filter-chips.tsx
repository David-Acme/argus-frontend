import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

export type FilterChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconName;
  leading?: ReactNode;
};

type FilterChipsProps<T extends string> = {
  options: readonly FilterChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  scroll?: boolean;
  contentClassName?: string;
};

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  scroll = false,
  contentClassName,
}: FilterChipsProps<T>) {
  const chips = options.map((option) => {
    const active = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={option.label}
        onPress={() => onChange(option.value)}
        className={cn(
          'h-10 max-w-[240px] flex-row items-center gap-2 rounded-full px-4 active:opacity-80',
          active ? 'bg-interactive' : 'bg-card shadow-sm shadow-black/[0.05]'
        )}>
        {option.leading}
        {option.icon ? (
          <Icon
            name={option.icon}
            className={cn('size-4', active ? 'text-foreground-on-interactive' : 'text-foreground-secondary')}
          />
        ) : null}
        <Text
          variant="label"
          numberOfLines={1}
          className={active ? 'text-foreground-on-interactive' : 'text-foreground'}>
          {option.label}
        </Text>
      </Pressable>
    );
  });

  if (!scroll) return <View className={cn('flex-row flex-wrap gap-2', contentClassName)}>{chips}</View>;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName={cn('gap-2', contentClassName)}>
      {chips}
    </ScrollView>
  );
}

import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';

type CalendarHeaderProps = {
  title: string;
  subtitle: string;
  previousLabel: string;
  nextLabel: string;
  todayLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  accessory?: ReactNode;
};

export function CalendarHeader({
  title,
  subtitle,
  previousLabel,
  nextLabel,
  todayLabel,
  onPrevious,
  onNext,
  onToday,
  accessory,
}: CalendarHeaderProps) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text variant="display" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" className="mt-0.5">
          {subtitle}
        </Text>
      </View>
      {accessory}
      <View className="flex-row items-center gap-1">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={todayLabel}
          hitSlop={6}
          className="bg-surface-secondary web:hover:bg-border-subtle mr-1 min-h-9 justify-center rounded-full px-3.5 active:opacity-70"
          onPress={onToday}>
          <Text variant="caption" className="text-foreground font-semibold">
            {todayLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousLabel}
          hitSlop={4}
          className="web:hover:bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-60"
          onPress={onPrevious}>
          <Icon name="chevron-left" className="text-foreground-secondary size-5" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          hitSlop={4}
          className="web:hover:bg-surface-secondary size-9 items-center justify-center rounded-full active:opacity-60"
          onPress={onNext}>
          <Icon name="chevron-right" className="text-foreground-secondary size-5" />
        </Pressable>
      </View>
    </View>
  );
}

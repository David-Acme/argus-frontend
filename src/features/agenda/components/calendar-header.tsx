import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type CalendarHeaderProps = {
  title: string;
  subtitle: string;
  previousLabel: string;
  nextLabel: string;
  todayLabel: string;
  todayHint: string;
  showsToday: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  accessory?: ReactNode;
};

type StepButtonProps = {
  icon: 'chevron-left' | 'chevron-right';
  label: string;
  onPress: () => void;
};

function StepButton({ icon, label, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className="web:hover:bg-card/70 size-8 items-center justify-center rounded-full active:opacity-60"
      onPress={onPress}>
      <Icon name={icon} className="text-foreground-secondary size-[18px]" />
    </Pressable>
  );
}

export function CalendarHeader({
  title,
  subtitle,
  previousLabel,
  nextLabel,
  todayLabel,
  todayHint,
  showsToday,
  onPrevious,
  onNext,
  onToday,
  accessory,
}: CalendarHeaderProps) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text variant="display" numberOfLines={1} className="capitalize">
          {title}
        </Text>
        <Text variant="caption" className="mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {accessory}
      <View className="bg-surface-secondary flex-row items-center gap-0.5 rounded-2xl p-1">
        <StepButton icon="chevron-left" label={previousLabel} onPress={onPrevious} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showsToday ? todayLabel : todayHint}
          className={cn(
            'min-h-8 flex-row items-center gap-1.5 rounded-lg px-3',
            showsToday
              ? 'web:hover:bg-card/70 active:opacity-70'
              : 'bg-card web:hover:bg-card/80 shadow-sm shadow-black/10 active:opacity-70'
          )}
          onPress={onToday}>
          <View
            className={cn('size-1.5 rounded-full', showsToday ? 'bg-muted-foreground/50' : 'bg-accent')}
          />
          <Text
            variant="caption"
            className={cn('font-semibold', showsToday ? 'text-foreground-secondary' : 'text-foreground')}>
            {todayLabel}
          </Text>
        </Pressable>
        <StepButton icon="chevron-right" label={nextLabel} onPress={onNext} />
      </View>
    </View>
  );
}

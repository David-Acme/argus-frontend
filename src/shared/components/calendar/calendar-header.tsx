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
}: CalendarHeaderProps) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <Text
          className="text-[30px] font-bold leading-[34px] tracking-tight"
          numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-[13px]">{subtitle}</Text>
      </View>
      <View className="flex-row items-center gap-1.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={todayLabel}
          className="bg-surface-secondary mr-1 rounded-full px-3 py-2 active:opacity-70"
          onPress={onToday}>
          <Text className="text-foreground-secondary text-[12px] font-semibold">{todayLabel}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousLabel}
          className="size-9 items-center justify-center rounded-full active:opacity-60"
          onPress={onPrevious}>
          <Icon name="chevron-left" className="text-foreground-secondary size-5" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          className="size-9 items-center justify-center rounded-full active:opacity-60"
          onPress={onNext}>
          <Icon name="chevron-right" className="text-foreground-secondary size-5" />
        </Pressable>
      </View>
    </View>
  );
}

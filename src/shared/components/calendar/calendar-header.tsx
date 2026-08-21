import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';

type CalendarHeaderProps = {
  /** Large line, e.g. "August". */
  title: string;
  /** Quiet line under it, e.g. "2026" or the weekday. */
  subtitle: string;
  previousLabel: string;
  nextLabel: string;
  todayLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

/**
 * Title large and top-left, controls small and right: the month is the thing
 * you read, the arrows are the thing you use. Centring the title would make
 * them compete.
 */
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
          className="text-[30px] font-bold capitalize leading-[34px] tracking-tight"
          numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-muted-foreground mt-0.5 text-[13px] capitalize">{subtitle}</Text>
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

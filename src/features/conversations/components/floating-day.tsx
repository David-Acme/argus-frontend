import { useImperativeHandle, useState, type Ref } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { DaySeparator } from '@/features/conversations/components/day-separator';
import type { ThreadDays } from '@/features/conversations/components/thread-item';
import { dayPillOf, floatingDayOf } from '@/features/conversations/model/thread-list';
import type { ThreadItem } from '@/features/conversations/model/thread-list';

export type FloatingDayHandle = { viewed: (viewable: readonly ThreadItem[]) => void };

export type FloatingDayProps = {
  ref: Ref<FloatingDayHandle>;
  shown: SharedValue<number>;
  days: ThreadDays;
  atEnd: boolean;
  ready: boolean;
};

export function FloatingDay({ ref, shown, days, atEnd, ready }: FloatingDayProps) {
  const [top, setTop] = useState<number | null>(null);
  const { today } = days;
  useImperativeHandle(
    ref,
    () => ({ viewed: (viewable) => setTop(floatingDayOf({ viewable, today })) }),
    [today]
  );
  const fade = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const day = dayPillOf({ day: top, atEnd, ready });
  if (day === null) return null;
  return (
    <Animated.View
      pointerEvents="none"
      aria-hidden
      style={fade}
      className="bg-bg absolute inset-x-0 top-0 py-1">
      <DaySeparator floating label={days.dayLabel(day)} />
    </Animated.View>
  );
}

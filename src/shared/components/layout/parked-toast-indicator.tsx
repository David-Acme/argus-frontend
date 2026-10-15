import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore } from '@/core/stores';
import { Icon } from '@/shared/components/ui/icon';

export function ParkedToastIndicator() {
  const insets = useSafeAreaInsets();
  const parked = useToastStore((state) => state.parked);
  const reopenParked = useToastStore((state) => state.reopenParked);
  const next = parked[0];

  if (!next) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(150)}
      className="absolute right-16"
      style={{ top: insets.top + 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={next.title}
        hitSlop={8}
        onPress={() => reopenParked(next.id)}
        className="bg-card border-border size-10 items-center justify-center rounded-full border shadow-sm shadow-black/10 active:opacity-80">
        <Icon name="triangle-alert" className="text-error-strong size-5" />
      </Pressable>
    </Animated.View>
  );
}

import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/shared/components/ui/text';
import { useReduceMotion } from '@/shared/hooks/use-reduce-motion';
import { useTranslation } from '@/shared/hooks/use-translation';

type TypingDotProps = {
  delay: number;
  still: boolean;
};

const DOTS = [0, 160, 320] as const;

function TypingDot({ delay, still }: TypingDotProps) {
  const opacity = useSharedValue(still ? 0.7 : 0.3);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (still) return;
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(1, { duration: 360 }), withTiming(0.3, { duration: 360 })),
        -1
      )
    );
    return () => cancelAnimation(opacity);
  }, [delay, opacity, still]);

  return <Animated.View style={style} className="bg-foreground-secondary size-1.5 rounded-full" />;
}

export function TypingIndicator() {
  const { t } = useTranslation();
  const still = useReduceMotion();

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('screens.conversations.chat.typing')}
      className="items-start gap-1 self-start">
      <View className="bg-card dark:bg-card-secondary flex-row items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-3 shadow-sm shadow-black/[0.06]">
        {DOTS.map((delay) => (
          <TypingDot key={delay} delay={delay} still={still} />
        ))}
      </View>
      <Text variant="micro" className="text-muted-foreground px-1">
        {t('screens.conversations.chat.typing')}
      </Text>
    </View>
  );
}

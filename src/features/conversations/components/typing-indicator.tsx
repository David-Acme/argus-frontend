import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { motion, useEffects } from '@/shared/theme';
import { BubbleTail } from '@/features/conversations/components/bubble-tail';

const DOT_DELAYS = [0, 200, 400] as const;

const DOT_BLINK = {
  animationName: { '50%': { opacity: motion.loop.liveDim } },
  animationDuration: motion.loop.shimmer,
  animationIterationCount: 'infinite',
  animationTimingFunction: 'ease-in-out',
} as const;

const dotStyle = (delay: number) => ({ ...DOT_BLINK, animationDelay: delay });

export function TypingIndicator() {
  const { t } = useTranslation();
  const { reduceMotion } = useEffects();
  return (
    <View
      accessible
      role="status"
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('screens.conversations.chat.typing')}
      className="items-start pt-3">
      <View className="bg-surface rounded-control rounded-tl-none px-3 py-2">
        <BubbleTail side="start" fill="surface" />
        <View className="h-3 flex-row items-center gap-1">
          {DOT_DELAYS.map((delay) => (
            <Animated.View
              key={delay}
              className="bg-text-3 size-typing-dot rounded-full"
              style={reduceMotion ? undefined : dotStyle(delay)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

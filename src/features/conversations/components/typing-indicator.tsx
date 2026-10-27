import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from '@/shared/hooks/use-translation';
import { motion, size, useEffects } from '@/shared/theme';
import { Presence } from '@/shared/ui/presence';

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
      className="flex-row items-end gap-2 pt-3">
      <Presence state="think" size={size.presenceBubble} />
      <View className="bg-surface rounded-control flex-row gap-1 px-4 py-3">
        {DOT_DELAYS.map((delay) => (
          <Animated.View
            key={delay}
            className="bg-text-3 size-dot rounded-full"
            style={reduceMotion ? undefined : dotStyle(delay)}
          />
        ))}
      </View>
    </View>
  );
}

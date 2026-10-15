import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { IconName, ToastItem } from '@/core/types';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { TOAST_SWIPE_PX } from '@/shared/constants';
import { itemIn, overlayOut } from '@/shared/libs/animations';
import { cn } from '@/shared/libs/utils';

type ToastCardProps = {
  item: ToastItem;
  dismissLabel: string;
  onDismiss: (id: string) => void;
};

const ICON: Record<ToastItem['intent'], IconName> = {
  success: 'check',
  error: 'triangle-alert',
  warning: 'triangle-alert',
  info: 'bell',
};

const ACCENT: Record<ToastItem['intent'], string> = {
  success: 'text-success',
  error: 'text-error-strong',
  warning: 'text-warning-strong',
  info: 'text-foreground-secondary',
};

export function ToastCard({ item, dismissLabel, onDismiss }: ToastCardProps) {
  const { action } = item;
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const swipe = Gesture.Pan()
    .enabled(action === undefined)
    .onUpdate((event) => {
      offsetX.value = event.translationX;
      offsetY.value = Math.min(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY < -TOAST_SWIPE_PX || Math.abs(event.translationX) > TOAST_SWIPE_PX) {
        scheduleOnRN(onDismiss, item.id);
        return;
      }
      offsetX.value = withSpring(0);
      offsetY.value = withSpring(0);
    });

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }, { translateY: offsetY.value }],
  }));

  return (
    <GestureDetector gesture={swipe}>
    <Animated.View entering={itemIn} exiting={overlayOut} style={motion}>
      <View
        aria-live={item.intent === 'error' ? 'assertive' : 'polite'}
        className="bg-card border-border-subtle flex-row items-center gap-3 rounded-2xl border p-3.5 shadow-lg shadow-black/15">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={[item.title, item.description].filter(Boolean).join('. ')}
          accessibilityHint={dismissLabel}
          onPress={() => onDismiss(item.id)}
          className="min-w-0 flex-1 flex-row items-start gap-3 active:opacity-80">
          <Icon name={ICON[item.intent]} className={cn('mt-0.5 size-4 shrink-0', ACCENT[item.intent])} />
          <View className="min-w-0 flex-1">
            <Text className="text-caption font-semibold" numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text variant="caption" className="text-foreground-secondary mt-0.5" numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </Pressable>
        {action ? (
          <Button
            size="sm"
            variant="secondary"
            className="-my-1"
            onPress={() => {
              action.onPress();
              onDismiss(item.id);
            }}>
            <Text>{action.label}</Text>
          </Button>
        ) : null}
      </View>
    </Animated.View>
    </GestureDetector>
  );
}

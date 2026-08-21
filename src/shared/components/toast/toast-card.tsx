import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { IconName, ToastItem } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
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
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-foreground-secondary',
};

/** Pressing the card dismisses it. */
export function ToastCard({ item, dismissLabel, onDismiss }: ToastCardProps) {
  return (
    <Animated.View entering={itemIn} exiting={overlayOut}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={dismissLabel}
        onPress={() => onDismiss(item.id)}
        className="bg-card border-border-subtle flex-row items-start gap-3 rounded-2xl border p-3.5 shadow-lg shadow-black/15 active:opacity-80">
        <Icon name={ICON[item.intent]} className={cn('mt-0.5 size-4 shrink-0', ACCENT[item.intent])} />
        <View className="min-w-0 flex-1">
          <Text className="text-[13px] font-semibold" numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text className="text-foreground-secondary mt-0.5 text-xs leading-4" numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

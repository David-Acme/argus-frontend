import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { cn } from '@/shared/libs/utils';

type SwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const KNOB_TRAVEL = 20;

export function Switch({ value, onChange, accessibilityLabel, disabled = false }: SwitchProps) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? KNOB_TRAVEL : 0, { duration: 160 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      className={cn(
        'h-7 w-12 justify-center rounded-full px-0.5 active:opacity-80',
        value ? 'bg-interactive' : 'bg-border',
        disabled && 'opacity-50'
      )}>
      <Animated.View
        className={cn(
          'bg-card size-6 rounded-full shadow-sm shadow-black/20',
          !value && 'dark:bg-foreground-secondary'
        )}
        style={knob}
      />
    </Pressable>
  );
}

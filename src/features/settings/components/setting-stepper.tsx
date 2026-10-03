import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SettingStepperProps = {
  value: number;
  min: number;
  max: number;
  step: number;
  decimals: number;
  label: string;
  onChange: (value: number) => void;
};

type StepButtonProps = {
  icon: 'minus' | 'plus';
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function StepButton({ icon, label, disabled, onPress }: StepButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      className={cn(
        'bg-card size-9 items-center justify-center rounded-full shadow-sm shadow-black/10 active:opacity-70',
        disabled && 'opacity-40'
      )}>
      <Icon name={icon} className="text-foreground size-4" />
    </Pressable>
  );
}

export function SettingStepper({ value, min, max, step, decimals, label, onChange }: SettingStepperProps) {
  const increment = step > 0 ? step : 1;
  const bounded = (next: number) => {
    const clamped = max > min ? Math.min(max, Math.max(min, next)) : next;
    return Number(clamped.toFixed(decimals));
  };

  return (
    <View className="bg-surface-secondary flex-row items-center gap-2 rounded-full p-1">
      <StepButton
        icon="minus"
        label={`${label} −`}
        disabled={max > min && value <= min}
        onPress={() => onChange(bounded(value - increment))}
      />
      <Text accessibilityLabel={label} className="min-w-14 text-center font-semibold tabular-nums">
        {value.toFixed(decimals)}
      </Text>
      <StepButton
        icon="plus"
        label={`${label} +`}
        disabled={max > min && value >= max}
        onPress={() => onChange(bounded(value + increment))}
      />
    </View>
  );
}

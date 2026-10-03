import { Pressable, View } from 'react-native';
import { cn } from '@/shared/libs/utils';

type SwitchProps = {
  value: boolean;
  onChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

export function Switch({ value, onChange, accessibilityLabel, disabled = false }: SwitchProps) {
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
        value ? 'bg-interactive' : 'bg-surface-secondary',
        disabled && 'opacity-50'
      )}>
      <View
        className={cn(
          'bg-card size-6 rounded-full shadow-sm shadow-black/20',
          value ? 'self-end' : 'self-start'
        )}
      />
    </Pressable>
  );
}

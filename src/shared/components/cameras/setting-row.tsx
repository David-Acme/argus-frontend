import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SettingRowProps = {
  label: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
};

export function SettingRow({ label, value, disabled, onChange }: SettingRowProps) {
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: withTiming(value ? 18 : 0, { duration: 160 }) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!value)}
      className={cn(
        'flex-row items-center justify-between py-2.5',
        disabled ? 'opacity-50' : 'active:opacity-70'
      )}>
      <Text className="text-[14px]">{label}</Text>
      <View
        className={cn(
          'h-6 w-11 justify-center rounded-full px-0.5',
          value ? 'bg-interactive' : 'bg-border'
        )}>
        <Animated.View className="bg-card size-5 rounded-full shadow-sm shadow-black/20" style={knob} />
      </View>
    </Pressable>
  );
}

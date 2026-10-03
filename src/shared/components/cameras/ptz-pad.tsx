import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { PTZ_DIRECTIONS } from '@/shared/constants';
import { cn } from '@/shared/libs/utils';

type PtzPadProps = {
  labels: { up: string; down: string; left: string; right: string; center: string };
  disabled?: boolean;
  onStep: (direction: number) => void;
  onCenter: () => void;
};

export function PtzPad({ labels, disabled, onStep, onCenter }: PtzPadProps) {
  const button = cn(
    'bg-card size-12 items-center justify-center rounded-2xl shadow-sm shadow-black/[0.08]',
    disabled ? 'opacity-40' : 'active:opacity-70'
  );

  return (
    <View className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.up}
        disabled={disabled}
        onPress={() => onStep(PTZ_DIRECTIONS.up)}
        className={button}>
        <Icon name="chevron-up" className="text-foreground size-5" />
      </Pressable>

      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.left}
          disabled={disabled}
          onPress={() => onStep(PTZ_DIRECTIONS.left)}
          className={button}>
          <Icon name="chevron-left" className="text-foreground size-5" />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.center}
          disabled={disabled}
          onPress={onCenter}
          className={cn(button, 'bg-surface-secondary')}>
          <Text className="text-micro font-semibold">{labels.center}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={labels.right}
          disabled={disabled}
          onPress={() => onStep(PTZ_DIRECTIONS.right)}
          className={button}>
          <Icon name="chevron-right" className="text-foreground size-5" />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={labels.down}
        disabled={disabled}
        onPress={() => onStep(PTZ_DIRECTIONS.down)}
        className={button}>
        <Icon name="chevron-down" className="text-foreground size-5" />
      </Pressable>
    </View>
  );
}

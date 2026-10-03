import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type CreateAffordanceProps = {
  label: string;
  onPress: () => void;
  fill?: boolean;
};

export function CreateAffordance({ label, onPress, fill = false }: CreateAffordanceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'border-border rounded-[14px] border-2 border-dashed active:opacity-70 web:hover:bg-surface-secondary',
        fill
          ? 'min-h-[140px] flex-1 items-center justify-center gap-3 px-4 py-6'
          : 'min-h-11 flex-row items-center gap-2 px-3'
      )}>
      <View
        className={cn(
          'bg-surface-secondary items-center justify-center rounded-full',
          fill ? 'size-10' : 'size-6'
        )}>
        <Icon name="plus" className={cn('text-foreground-secondary', fill ? 'size-5' : 'size-3.5')} />
      </View>
      <Text variant="label" className="text-foreground-secondary">
        {label}
      </Text>
    </Pressable>
  );
}

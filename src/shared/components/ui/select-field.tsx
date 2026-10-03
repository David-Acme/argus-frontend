import { Pressable, View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SelectFieldProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> & {
    label?: string;
    placeholder?: string;
    invalid?: boolean;
  };

export function SelectField({
  label,
  placeholder,
  invalid = false,
  disabled = false,
  className,
  ...props
}: SelectFieldProps) {
  const empty = label == null || label.length === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled === true }}
      accessibilityLabel={empty ? placeholder : label}
      disabled={disabled}
      className={cn(
        'bg-card h-11 flex-row items-center justify-between gap-2 rounded-md border px-3 active:opacity-70',
        invalid ? 'border-error' : 'border-border',
        disabled === true && 'opacity-50',
        className
      )}
      {...props}>
      <View className="min-w-0 flex-1">
        <Text
          className={cn('text-[15px]', empty ? 'text-muted-foreground' : 'text-foreground')}
          numberOfLines={1}>
          {empty ? placeholder : label}
        </Text>
      </View>
      <Icon name="chevron-down" className="text-muted-foreground size-4" />
    </Pressable>
  );
}

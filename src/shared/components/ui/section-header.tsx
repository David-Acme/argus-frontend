import { Pressable, View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SectionHeaderProps = {
  title: string;
  count?: number;
  action?: string;
  onAction?: () => void;
  className?: string;
};

export function SectionHeader({ title, count, action, onAction, className }: SectionHeaderProps) {
  return (
    <View className={cn('flex-row items-center gap-2', className)}>
      <Text variant="headline" className="min-w-0 shrink" numberOfLines={1}>
        {title}
      </Text>
      {count != null && count > 0 ? (
        <View className="bg-surface-secondary min-w-6 items-center rounded-full px-2 py-0.5">
          <Text variant="micro" className="text-foreground-secondary font-semibold">
            {String(count)}
          </Text>
        </View>
      ) : null}
      <View className="flex-1" />
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={8}
          className="web:hover:opacity-70 min-h-9 justify-center rounded-full active:opacity-60"
          disabled={!onAction}
          onPress={onAction}>
          <Text variant="label" className="text-foreground-secondary">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

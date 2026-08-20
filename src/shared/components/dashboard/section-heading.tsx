import { Pressable, View } from 'react-native';
import { Text } from '@/shared/components/ui/text';

type SectionHeadingProps = {
  title: string;
  /** Omit to render the title alone. */
  action?: string;
  onAction?: () => void;
};

export function SectionHeading({ title, action, onAction }: SectionHeadingProps) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-xl font-semibold tracking-tight">{title}</Text>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          className="active:opacity-60"
          onPress={onAction}>
          <Text className="text-foreground-secondary text-sm font-medium">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

import { View } from 'react-native';
import type { IconName } from '@/core/types';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SecurityEmptyProps = {
  icon: IconName;
  title: string;
  hint: string;
  className?: string;
};

export function SecurityEmpty({ icon, title, hint, className }: SecurityEmptyProps) {
  return (
    <View className={cn('flex-1 items-center justify-center gap-2 px-6 py-6', className)}>
      <View className="bg-surface-secondary mb-1 size-12 items-center justify-center rounded-full">
        <Icon name={icon} className="text-muted-foreground size-6" />
      </View>
      <Text variant="label" className="text-foreground text-center">
        {title}
      </Text>
      <Text variant="caption" className="max-w-80 text-center">
        {hint}
      </Text>
    </View>
  );
}

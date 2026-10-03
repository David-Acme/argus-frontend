import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { cn } from '@/shared/libs/utils';

type SecurityPanelProps = {
  title: string;
  description?: string;
  count?: number;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function SecurityPanel({
  title,
  description,
  count,
  action,
  className,
  children,
}: SecurityPanelProps) {
  return (
    <View className={cn('bg-card gap-3 rounded-3xl p-4 shadow-md shadow-black/[0.05]', className)}>
      <View className="min-h-9 flex-row items-center gap-2">
        <Text className="min-w-0 shrink font-semibold" numberOfLines={1}>
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
        {action}
      </View>
      {description ? (
        <Text variant="caption" className="-mt-1">
          {description}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

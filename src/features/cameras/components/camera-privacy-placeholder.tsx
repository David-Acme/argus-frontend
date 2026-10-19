import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { StatusBadge } from '@/shared/components/ui/status-badge';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraPrivacyPlaceholderProps = {
  fill?: boolean;
  compact?: boolean;
  unconfirmed?: boolean;
  className?: string;
};

const PLACEHOLDER_ASPECT = 16 / 9;

export function CameraPrivacyPlaceholder({
  fill = false,
  compact = false,
  unconfirmed = false,
  className,
}: CameraPrivacyPlaceholderProps) {
  const { t } = useTranslation();

  if (compact) {
    return (
      <View className={cn('bg-surface-secondary items-center justify-center', fill ? 'absolute inset-0' : 'w-full rounded-2xl', className)}>
        <StatusBadge
          label={t(unconfirmed ? 'screens.cameras.privacy-badge-unconfirmed' : 'screens.cameras.privacy-badge')}
          icon="eye-off"
        />
      </View>
    );
  }

  return (
    <View
      className={cn(
        'bg-surface-secondary w-full items-center justify-center gap-3 p-6',
        fill ? 'absolute inset-0' : 'rounded-2xl',
        className,
      )}
      style={fill ? undefined : { aspectRatio: PLACEHOLDER_ASPECT }}>
      <View className="bg-card size-14 items-center justify-center rounded-full shadow-sm shadow-black/[0.05]">
        <Icon name="eye-off" className="text-muted-foreground size-6" />
      </View>
      <View className="max-w-sm items-center gap-1">
        <Text variant="label" className="text-center">
          {t(unconfirmed ? 'screens.cameras.privacy-placeholder-unconfirmed' : 'screens.cameras.privacy-placeholder')}
        </Text>
        <Text variant="caption" className="text-center">
          {t(
            unconfirmed
              ? 'screens.cameras.privacy-placeholder-unconfirmed-hint'
              : 'screens.cameras.privacy-placeholder-hint',
          )}
        </Text>
      </View>
    </View>
  );
}

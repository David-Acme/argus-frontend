import { View } from 'react-native';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { cn } from '@/shared/libs/utils';

type CameraPrivacyPlaceholderProps = {
  fill?: boolean;
  className?: string;
};

const PLACEHOLDER_ASPECT = 16 / 9;

export function CameraPrivacyPlaceholder({ fill = false, className }: CameraPrivacyPlaceholderProps) {
  const { t } = useTranslation();

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
          {t('screens.cameras.privacy-placeholder')}
        </Text>
        <Text variant="caption" className="text-center">
          {t('screens.cameras.privacy-placeholder-hint')}
        </Text>
      </View>
    </View>
  );
}

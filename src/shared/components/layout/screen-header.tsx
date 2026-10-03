import type { ReactNode } from 'react';
import { View } from 'react-native';
import { IconButton } from '@/shared/components/ui/icon-button';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, action }: ScreenHeaderProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-3 pb-4">
      {onBack ? <IconButton icon="arrow-left" label={t('common.back')} onPress={onBack} /> : null}
      <View className="min-w-0 flex-1">
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" className="text-foreground-secondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

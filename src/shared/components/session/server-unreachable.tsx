import { CenteredScreen } from '@/shared/components/layout';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';
import { View } from 'react-native';

type ServerUnreachableProps = {
  onRetry: () => void;
};

export function ServerUnreachable({ onRetry }: ServerUnreachableProps) {
  const { t } = useTranslation();

  return (
    <CenteredScreen maxWidth={420}>
      <View className="items-center gap-4">
        <View className="bg-surface-secondary size-14 items-center justify-center rounded-full">
          <Icon name="wifi-off" className="text-foreground-secondary size-6" />
        </View>
        <View className="items-center gap-1.5">
          <Text variant="title" className="text-center">
            {t('common.server-unreachable.title')}
          </Text>
          <Text variant="caption" className="text-foreground-secondary text-center">
            {t('common.server-unreachable.description')}
          </Text>
        </View>
        <Button onPress={onRetry}>
          <Icon name="refresh-cw" />
          <Text>{t('common.retry')}</Text>
        </Button>
      </View>
    </CenteredScreen>
  );
}

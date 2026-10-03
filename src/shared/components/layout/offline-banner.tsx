import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { synchronizeService } from '@/core/services/sync/synchronize.service';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useOfflineNotice } from '@/shared/components/layout/use-offline-notice';
import { useTranslation } from '@/shared/hooks/use-translation';

export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const offline = useOfflineNotice();
  const [retrying, setRetrying] = useState(false);

  if (!offline) return null;

  const retry = async () => {
    setRetrying(true);
    await synchronizeService.ensureConnected();
    setRetrying(false);
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 top-0 z-40 items-center px-4"
      style={{ paddingTop: insets.top + 8 }}>
      <Animated.View
        entering={FadeInUp.duration(220)}
        exiting={FadeOutUp.duration(180)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="bg-card border-border w-full max-w-[520px] flex-row items-center gap-3 rounded-2xl border py-2 pr-2 pl-4 shadow-md shadow-black/10">
        <Icon name="wifi-off" className="text-warning-strong size-5" />
        <View className="min-w-0 flex-1">
          <Text variant="label">{t('common.offline.title')}</Text>
          <Text variant="caption">{t('common.offline.description')}</Text>
        </View>
        <Button size="sm" variant="ghost" loading={retrying} onPress={retry}>
          <Text>{t('common.retry')}</Text>
        </Button>
      </Animated.View>
    </View>
  );
}

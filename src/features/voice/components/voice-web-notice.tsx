import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export function VoiceWebNotice() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View
      className="bg-background flex-1 items-center justify-center gap-6 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="bg-accent-soft size-16 items-center justify-center rounded-full">
        <Icon name="messages-square" className="text-accent-strong size-8" />
      </View>
      <View className="items-center gap-2">
        <Text variant="title" className="text-center">
          {t('screens.voice.web-only-title')}
        </Text>
        <Text variant="caption" className="text-foreground-secondary text-center">
          {t('screens.voice.web-only-hint')}
        </Text>
      </View>
      <Button variant="outline" size="lg" onPress={() => router.replace('/')}>
        <Text>{t('common.continue')}</Text>
      </Button>
    </View>
  );
}

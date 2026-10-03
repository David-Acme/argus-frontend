import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/shared/components/ui/button';
import { Icon } from '@/shared/components/ui/icon';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export function FaceWebNotice({ mode }: { mode: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const enrolling = mode !== 'login';

  return (
    <View
      className="bg-background flex-1 w-full max-w-md self-center items-center justify-center gap-6 px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View className="bg-accent-soft size-16 items-center justify-center rounded-full">
        <Icon name="scan-face" className="text-accent-strong size-8" />
      </View>
      <View className="items-center gap-2">
        <Text variant="h3" className="text-center">
          {t('screens.face.web-only-title')}
        </Text>
        <Text className="text-foreground-secondary text-center text-sm leading-5">
          {t(enrolling ? 'screens.face.web-only-enroll' : 'screens.face.web-only-login')}
        </Text>
      </View>
      {enrolling ? (
        <Button variant="outline" size="lg" onPress={() => router.replace('/welcome')}>
          <Icon name="arrow-left" />
          <Text>{t('common.back')}</Text>
        </Button>
      ) : (
        <Button variant="outline" size="lg" onPress={() => router.replace('/login')}>
          <Icon name="monitor" />
          <Text>{t('screens.login.title')}</Text>
        </Button>
      )}
    </View>
  );
}

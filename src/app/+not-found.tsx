import { Link, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <>
      <Stack.Screen options={{ title: t('screens.not-found.title') }} />
      <View
        className="bg-background flex-1 w-full max-w-md self-center items-center justify-center gap-4 px-6"
        style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
        <Text variant="h4" className="text-center">
          {t('screens.not-found.title')}
        </Text>
        <Text variant="muted" className="text-center leading-5">
          {t('screens.not-found.body')}
        </Text>
        <Link href="/" className="mt-2">
          <Text className="text-accent font-medium underline underline-offset-4">
            {t('screens.not-found.go-home')}
          </Text>
        </Link>
      </View>
    </>
  );
}

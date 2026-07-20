import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/core/i18n';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('not-found.title') }} />
      <View>
        <Text>{t('not-found.subtitle')}</Text>

        <Link href="/">
          <Text>{t('not-found.button')}</Text>
        </Link>
      </View>
    </>
  );
}

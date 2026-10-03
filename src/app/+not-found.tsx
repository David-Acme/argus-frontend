import { Link, Stack } from 'expo-router';
import { CenteredScreen } from '@/shared/components/layout';
import { Text } from '@/shared/components/ui/text';
import { useTranslation } from '@/shared/hooks/use-translation';

export default function NotFoundScreen() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen options={{ title: t('screens.not-found.title') }} />
      <CenteredScreen maxWidth={448}>
        <Text variant="headline" className="text-center">
          {t('screens.not-found.title')}
        </Text>
        <Text variant="caption" className="text-center leading-5">
          {t('screens.not-found.body')}
        </Text>
        <Link href="/" className="mt-2">
          <Text className="text-accent-strong font-medium underline underline-offset-4">
            {t('screens.not-found.go-home')}
          </Text>
        </Link>
      </CenteredScreen>
    </>
  );
}

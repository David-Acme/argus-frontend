import { useRouter, type Href } from 'expo-router';
import { useTranslation } from '@/shared/hooks/use-translation';
import type { ScreenBack } from '@/shared/ui/screen';

export function useBack(fallback: Href = '/security'): ScreenBack {
  const router = useRouter();
  const { t } = useTranslation();
  return {
    label: t('common.back'),
    onPress: () => (router.canGoBack() ? router.back() : router.replace(fallback)),
  };
}

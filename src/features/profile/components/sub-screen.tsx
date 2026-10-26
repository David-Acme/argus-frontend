import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { useTranslation } from '@/shared/hooks/use-translation';
import { Screen } from '@/shared/ui/screen';

type SubScreenProps = { title: string; meta?: string; children: ReactNode };

export function SubScreen({ title, meta, children }: SubScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  return (
    <Screen title={title} meta={meta} back={{ label: t('common.back'), onPress: back }}>
      {children}
    </Screen>
  );
}
